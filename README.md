# Loxa

Try on any hair before the scissors. Pick a style and a colour, and get your own
face back with the new hair.

## Monorepo

```
apps/mobile      Expo (SDK 57) iOS app — the product
apps/web         Next.js marketing site, deployed to Cloudflare Workers via OpenNext
design-system    Tokens, guidelines and the click-through prototype. Source of truth.
packages/shared  @loxa/shared — contracts, the style/colour catalogue, credit rules
services/api     Cloudflare Worker — the whole backend, Hono + D1 + KV + Vertex
tools            The catalogue art generator — run by hand, see its README
```

## Getting started

```bash
bun install

# The Worker needs its secrets and its database. `.dev.vars` and `secrets/` are
# already in place — see CLAUDE.md for the Google Cloud setup.
cd services/api && bunx wrangler d1 execute loxa --local --file=schema.sql && cd ../..

bun run dev:api      # :8787
bun run dev:mobile   # then `i` for the simulator
```

Smoke test:

```bash
curl -s localhost:8787/health
curl -s localhost:8787/v1/credits -H 'X-Device-Id: dev-1'
```

## Where the rules live

`CLAUDE.md` has the conventions and the non-negotiables. `design-system/readme.md`
has the brand. Neither is optional reading before changing anything.
