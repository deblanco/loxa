# Loxa

An iOS hair try-on app. A photo goes in, the same face comes back with a
different cut and a different colour. Everything else — the credits, the
paywall, the catalogue — exists to make that one call sustainable.

The product rules come from the prototype in `design-system/Loxa Try-On.dc.html`.
It is runnable; open it before arguing about a screen.

## Layout

| Path | What it is | Runtime |
|---|---|---|
| `apps/mobile` | The app | Expo SDK 57, expo-router, iOS |
| `apps/web` | Marketing site, privacy policy, terms | Next.js 16 on Workers via OpenNext |
| `design-system` | Tokens, guidelines, prototype | Nothing. Reference only. |
| `packages/shared` | Contracts, catalogue, credit rules | Raw TypeScript, no build |
| `services/api` | The backend | Cloudflare Workers (workerd) |

Bun is the package manager and script runner. It does not serve HTTP anywhere in
this repo.

## Commands

```bash
bun install
bun run dev:api          # wrangler dev, :8787
bun run dev:mobile       # expo start
bun run dev:web          # next dev
bun run typecheck        # tsc --noEmit, every workspace
bun run test             # vitest, every workspace
bun run test:coverage    # the same, with the 90% gates
```

Deploys are per-workspace, never from the root:
`cd services/api && bun run deploy`, `cd apps/web && bun run deploy`.

## Non-negotiables

1. **AI keys never ship in the app.** `GOOGLE_SA_KEY` is a Worker secret, and
   `.dev.vars` locally. The app talks only to our Worker.
2. **Credits are spent server-side, before the model call.** `spendCredit` runs
   first in `core/try-on.ts`, and refunds on any throw. A client that asks nicely
   for a free render gets a 402.
3. **`design-system/` is the source of truth for every pixel and every word of
   UI copy.** If a colour, radius, or font size is not in
   `design-system/tokens/`, it does not exist.
4. **It is the user's own face.** Every render is conditioned on their photo. A
   generic model with the right haircut is the one thing this app must not
   return.

## Design system

The system is CSS; the app is React Native. Neither can import the other, so
there are two hand-maintained mirrors:

- `apps/mobile/src/theme.ts` — the RN mirror. The only file in the app allowed
  raw hex values.
- `apps/web/app/globals.css` — the web mirror, as Tailwind v4 `@theme` variables.

**A token change updates the CSS and both mirrors in the same commit.**

## Backend architecture — hexagonal

`services/api` is ports and adapters. Dependencies point inwards, always.

```
src/core/         product rules. No Hono, no D1, no KV, no fetch.
src/ports/        the interfaces core calls out through.
src/adapters/     the implementations. http/ d1/ kv/ vertex/ entitlements/
src/composition.ts  the only file that knows about both sides.
src/index.ts      three lines.
```

Placement rules:
- A product rule goes in `core/`. If you cannot test it without a binding, it is
  in the wrong place.
- HTTP status codes belong only in `adapters/http`. Core throws domain errors.
- A new metered route gets a credit check and a cache key, or it does not merge.

## Testing

`services/api` and `packages/shared` carry ~90% coverage, enforced by the runner.

**Vitest, not `bun test`, and this is the one sanctioned exception to the Bun
convention** — `bun test` cannot run workerd. The Worker's suite runs inside
workerd via `@cloudflare/vitest-pool-workers` against real D1 and KV bindings,
and must use the **istanbul** coverage provider: V8 coverage does not work
inside workerd.

No model or store is ever called for real in a test. `vi.stubGlobal('fetch', …)`,
and call counts are how the cache tests prove a cache hit.

## Conventions

- **Bun only.** Never `npm` or `pnpm` — a second lockfile in this repo is a bug.
- **Contracts first.** Any request or response shape lands in
  `packages/shared/src/contracts.ts` before it is used on either side.
- `packages/shared` ships raw TypeScript with no build step. Do not add one.
  That is why `apps/web` needs `transpilePackages` and Metro needs `watchFolders`.
- No linter and no formatter. `tsc --noEmit` is the gate.

## Google Cloud

Loxa has its own project, `loxa-506814`, in the `hola-org` organisation
(`889983319002`) — the same org as WhiskerMind but a separate project, so the
Vertex quota and the bill are Loxa's alone. A shared project would mean one
app's rate limit becoming the other's outage.

The service account is `loxa-cf@loxa-506814.iam.gserviceaccount.com`, holding
`roles/aiplatform.user` and **nothing else** — verified: it cannot list a
bucket, list an identity, read the billing account, or alter an IAM policy. That
is the point. A leaked key can call the image model and run up a bill; it cannot
be used to look around. Any future grant should have to justify itself against
that sentence.

Its key is `secrets/loxa-cf.json`, git-ignored, and reaches the Worker as the
`GOOGLE_SA_KEY` secret.

**`GOOGLE_PROJECT_ID` and `GOOGLE_SA_KEY` move together or not at all.** A key
from one project against another project's id fails at the token endpoint, and
that reaches the user as the model being unavailable rather than as an auth
error — an unpleasant thing to debug from the symptom.

The org enforces `iam.disableServiceAccountKeyCreation`. Minting a replacement
key means lifting the constraint, creating the key, and putting it back;
re-enforcing does **not** invalidate keys that already exist, so the exposure
window is seconds rather than permanent. Restore it in the same breath.

Two things are **not** shared with WhiskerMind, and must not be:

- **The D1 database.** One ledger for two apps means one app's credits paying
  for the other's renders.
- **The RevenueCat project.** WhiskerMind sells a different entitlement (`pro`)
  and different products, so pointing Loxa at it would read every real
  subscriber as free.

## Surviving an update

The device id is the primary key of `device_credits` on the Worker and the
RevenueCat customer id. There is no account to recover from, so losing it loses
the user's allowance, their bought credits and their subscription's association
at once. Two rules protect it, and both are easy to undo by accident:

1. **The device id lives in the keychain** (`src/api/device-id.ts`), not in
   AsyncStorage. AsyncStorage survives an App Store update but is wiped by a
   delete-and-reinstall; the keychain survives both. This matters more than it
   looks: `credit_grant` is keyed on the store transaction id, so a
   restore-purchases re-sync after a reinstall grants **nothing** — the grant
   already happened, to an id that no longer exists.
2. **No absolute path is ever persisted** (`src/store/look-record.ts`).
   `Paths.document` contains the app container UUID, which is reassigned on
   reinstall and can change on a restore or a device migration. A saved URI then
   points at a directory that no longer exists while the image sits safely where
   it always was — every screen shows a blank plate and nothing throws. Store
   the id; rebuild the path on read.

Anything else the profile grows — a gallery, a chosen avatar, a setting — gets
the same test: does it still resolve after the container UUID changes?

## Development controls

The profile carries a dashed panel under the real settings, rendered only under
`__DEV__` (`src/components/DevPanel.tsx`):

- **Subscriber** toggles the `X-Dev-Premium` header. It only ever *asks* — the
  Worker honours it solely where `DEV_PREMIUM` is set in `.dev.vars`, and never
  in production. The header used to be sent unconditionally in development,
  which made every build a subscriber and put the free tier and the paywall out
  of reach.
- **Reset this install** wipes the device id, the onboarding flag and every
  saved look. Deleting the app is *not* equivalent: the device id lives in the
  keychain so that it survives a reinstall, so uninstalling hands back the same
  identity and the same spent free credit.

`dev/reset.ts` holds the list of every storage key the app writes, and a test
reads the source to prove nothing has been added without it — that list going
stale is silent, and leaves the app remembering what the reset was meant to
forget.

## Gotchas

- `bunfig.toml`'s hoisted linker, `apps/mobile/metro.config.js`'s `watchFolders`,
  and `apps/web/next.config.ts`'s `outputFileTracingRoot` are **one decision**.
  Change them together or nothing resolves.
- `localhost:8787` is unreachable from a physical device. Use `bun run
  dev:api:lan` and point `EXPO_PUBLIC_API_URL` at the LAN address.
- Credits reset weekly and **do not roll over**. The reset is a comparison
  against the stored ISO week, not a scheduled job — this database has no cron.
- Two Workers, two config formats: `services/api/wrangler.toml` is `loxa`,
  `apps/web/wrangler.jsonc` is `loxa-web`. They must not share a name.
