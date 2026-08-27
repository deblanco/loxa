/**
 * A Google service account key becomes a bearer token.
 *
 * Vertex speaks OAuth, and there is no Google auth library that runs on
 * workerd — the Node ones reach for `crypto` and the filesystem. What they do
 * is small enough to do here: sign a JWT with the service account's private
 * key, hand it to Google's token endpoint, get an access token back.
 *
 * This is the only file that knows the shape of a service account key. The
 * composition root passes the raw secret through `parseServiceAccountKey` and
 * never looks inside it, the same way the KV adapter owns its own wire format.
 */

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const JWT_LIFETIME_SECONDS = 3600;

/**
 * Treat a token as expired a minute early.
 *
 * A token that dies in flight fails the render and refunds the credit, which is
 * correct but wasteful. The margin costs one extra mint per hour per isolate.
 */
const EXPIRY_MARGIN_MS = 60_000;

export interface ServiceAccountCredentials {
  clientEmail: string;
  /** PEM, PKCS#8. Exactly as it appears in the key file. */
  privateKey: string;
  tokenUri: string;
}

/**
 * Read the key file Google emits.
 *
 * Throws rather than returning a partial credential: a malformed secret is a
 * deployment mistake, and the loudest possible moment to find out is at
 * composition rather than on a user's first render.
 */
export function parseServiceAccountKey(raw: string): ServiceAccountCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SA_KEY is not valid JSON');
  }

  const key = parsed as Record<string, unknown>;
  const clientEmail = key.client_email;
  const privateKey = key.private_key;
  const tokenUri = key.token_uri ?? 'https://oauth2.googleapis.com/token';

  if (typeof clientEmail !== 'string' || typeof privateKey !== 'string') {
    throw new Error('GOOGLE_SA_KEY is missing client_email or private_key');
  }

  return { clientEmail, privateKey, tokenUri: tokenUri as string };
}

/**
 * Tokens live in the isolate, never in KV.
 *
 * KV would save a mint on a cold start and cost a round trip on every warm one,
 * and it would put a live bearer token for the project into storage. An isolate
 * that has never minted one simply mints one - a few hundred milliseconds, once.
 */
const tokens = new Map<string, { value: string; expiresAt: number }>();

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeSegment(value: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

/** PEM to the DER bytes `crypto.subtle.importKey` wants. */
function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function mint(credentials: ServiceAccountCredentials): Promise<{
  value: string;
  expiresAt: number;
}> {
  const issuedAt = Math.floor(Date.now() / 1000);

  const unsigned = [
    encodeSegment({ alg: 'RS256', typ: 'JWT' }),
    encodeSegment({
      iss: credentials.clientEmail,
      scope: SCOPE,
      aud: credentials.tokenUri,
      iat: issuedAt,
      exp: issuedAt + JWT_LIFETIME_SECONDS,
    }),
  ].join('.');

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(credentials.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );

  const response = await fetch(credentials.tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${base64url(new Uint8Array(signature))}`,
    }),
  });

  if (!response.ok) {
    // The body carries Google's own reason ("invalid_grant" for a revoked key,
    // a clock skew complaint, a disabled account) and is worth keeping: this is
    // the error a rotated key produces, and it is otherwise indistinguishable
    // from the model being down.
    throw new Error(`token endpoint returned ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error('token endpoint returned no access_token');

  return {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? JWT_LIFETIME_SECONDS) * 1000 - EXPIRY_MARGIN_MS,
  };
}

/** The cached token for this service account, minting one if it has expired. */
export async function accessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const cached = tokens.get(credentials.clientEmail);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const fresh = await mint(credentials);
  tokens.set(credentials.clientEmail, fresh);
  return fresh.value;
}

/** Test seam: isolates share module state, so a suite has to be able to clear it. */
export function resetTokenCache(): void {
  tokens.clear();
}
