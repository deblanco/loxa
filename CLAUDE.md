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

1. **AI keys never ship in the app.** `GOOGLE_SA_KEY` and `OPENROUTER_API_KEY`
   are Worker secrets, and `.dev.vars` locally. The app talks only to our
   Worker.
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

## Catalogue art

The style strip and the preview plate show generated photographs, not stock.
They are rendered once, offline, by `tools/generate-previews` — 24 cuts x 10
colours x 2 models — and served from the `loxa-assets` R2 bucket at
**`https://loxa-assets.blankhexadecimal.com`** (`EXPO_PUBLIC_ASSETS_URL`).

- **The catalogue is data, served from the bucket, not compiled into the app.**
  `catalogue.json` lists the cuts and colours that have actually been rendered,
  with their preview keys; the Worker serves it at `GET /v1/catalogue` and the
  app caches it for 24h. Publishing a newly-rendered style is an upload, not an
  App Store release. A style whose art does not exist is simply not in the
  manifest, which is how the strip stops offering cuts it cannot show.
- **`packages/shared/src/previews.ts` is the *generator's* key source, not the
  app's.** Nothing in `apps/mobile` imports it: the app asks for the keys the
  manifest hands it, which is what lets a style carry nine colours instead of
  ten without the app guessing and getting a 404.
- **Prompts never cross the wire.** The manifest carries ids, names, hex and
  keys. `HairStyle.prompt` and `HairColor.prompt` stay in `services/api`, so
  `HAIR_STYLES` remains the authoritative superset and the manifest is a
  published-subset projection of it. A *new* cut therefore still needs a Worker
  deploy for its prompt — but never an app release.
- Objects are immutable: a key is written once and cached for a year. To change
  a picture, change the key. **`catalogue.json` is the one exception** — it is
  overwritten on purpose, which is the whole feature, so it is uploaded with
  `max-age=60` and the Worker serves it with an etag and a day of cache on top.
  Because clients hold it for 24h, withdrawing a style means *stop listing it*,
  never *delete its objects*: deleting shows broken art to everyone still
  holding the old manifest.
- **A missing or malformed `catalogue.json` is a supported state.** The Worker
  falls back to the catalogue it shipped with rather than 500ing, so a fresh
  deploy against an empty bucket still answers and a bad upload degrades
  instead of breaking.
- `EXPO_PUBLIC_ASSETS_URL` unset is a supported state — the app falls back to
  the hatched placeholder rather than to broken images. It must be set in all
  four `apps/mobile/eas.json` profiles or every build ships a hatch-only
  catalogue.
- The bucket's `r2.dev` URL is deliberately **disabled**. One public endpoint,
  and it is the custom domain.

**The Vertex image quota is 2 requests/minute per base model**, so a full run
takes about eight hours unless it is raised. Concurrency does not help, and
neither does another model or another region — these models are `global` only.
The generator is resumable and never re-bills work already on disk.
`tools/generate-previews/manifest.ts` builds `catalogue.json` from the files
that exist on disk, and `upload.sh` pushes it **after** the images — a manifest
uploaded first advertises keys that are not in the bucket yet.

## The image model, and its fallback

Vertex is the primary and OpenRouter is the fallback, and both call the same
model — `gemini-3.1-flash-lite-image`, spelled `google/gemini-3.1-flash-lite-image`
on OpenRouter. A different model would return a stranger's face with the right
haircut, which is the one thing this app must not do.

The reason there are two is the quota: about one image a minute, project-wide,
and the model is published on `global` only, so there is no region to escape to
and concurrency does not help. OpenRouter serves it from its own Google AI
Studio and Vertex accounts, neither of which is `loxa-506814`. It bills $30 per
million image-output tokens — 1120 of them per image, $0.034 — so a render that
falls back costs what it would have cost anyway.

- **Only a transient failure falls through**: 429, 5xx, or a host that could not
  be reached. That is what `RendererUnavailableError.transient` means, and
  `adapters/fallback-renderer.ts` is the only thing that reads it.
- **A rejected photo never falls through.** A safety block is a verdict on the
  user's photograph; the same model elsewhere returns the same verdict, one
  billed call later. Neither does a 400 or a bad key — retrying our own broken
  request buys a second bill and hides the fault.
- **The second call happens inside the port**, so `core/try-on.ts` refunds the
  credit only when both providers have failed and the ledger never learns there
  were two. A fallback in core would mean spending twice.
- **`OPENROUTER_API_KEY` unset is a supported state** — one provider, and the
  behaviour the Worker had before there were two. Unlike the RevenueCat stub, a
  missing key here costs availability, not correctness.
- `OPENROUTER_IMAGE_MODEL` is written out rather than derived from `IMAGE_MODEL`
  by prefixing `google/`. The two catalogues are not obliged to stay in step,
  and a drifted slug is a 404 on the one path nobody exercises until it is
  needed.

`tools/generate-previews` is deliberately **not** covered by this. It is run by
hand, it already has its own quota-aware retry, and an eight-hour run is not the
thing a user is waiting on.

## Backend architecture — hexagonal

`services/api` is ports and adapters. Dependencies point inwards, always.

```
src/core/         product rules. No Hono, no D1, no KV, no fetch.
src/ports/        the interfaces core calls out through.
src/adapters/     the implementations. http/ d1/ kv/ vertex/ openrouter/ entitlements/
src/composition.ts  the only file that knows about both sides.
src/index.ts      three lines.
```

Placement rules:
- A product rule goes in `core/`. If you cannot test it without a binding, it is
  in the wrong place.
- HTTP status codes belong only in `adapters/http`. Core throws domain errors.
- A new metered route gets a credit check and a cache key, or it does not merge.
- `GET /v1/catalogue` is the one route with neither, deliberately: it costs a
  bucket read rather than a model call, it is the same answer for everybody, and
  the app needs it before onboarding has minted a device id.

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
