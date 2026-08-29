# generate-previews

The catalogue art: 24 cuts × 10 colours × 2 models = 480 photographs, plus 48
strip tiles cropped from them. Run by hand, never in CI — it spends real money
against the Loxa Vertex project, and its output is committed.

```bash
bun run tools/generate-previews/index.ts --dry-run          # plan, bill nothing
bun run tools/generate-previews/index.ts --style=blunt-bob --limit=2
bun run tools/generate-previews/index.ts                    # the whole run

bun run tools/generate-previews/manifest.ts                 # print the manifest
bun run tools/generate-previews/manifest.ts --write         # write catalogue.json

tools/generate-previews/upload.sh                           # art, then manifest, to R2
```

Flags: `--dry-run`, `--style=`, `--colour=`, `--limit=`, `--concurrency=`.

## The pieces

| File | What it is |
|---|---|
| `index.ts` | Renders the photographs and crops the tiles |
| `prompt.ts` | The prompt, kept because a prompt nobody wrote down is a run nobody can repeat |
| `roster.json` | Which two models wear each cut |
| `manifest.ts` | Builds `catalogue.json` from the files that exist |
| `upload.sh` | Pushes it all to `loxa-assets` |
| `catalogue/` | The finished pictures. **Committed.** |
| `.cache/` | Downscaled bases, the failure list. Ignored. |

## It edits a photograph, it does not invent one

Every render is conditioned on a base portrait from `design-system/models/`,
exactly as the app conditions on the user's face. `roster.json` pairs two models
with each cut by hand rather than at random: the coil-and-loc styles go to
models whose hair plausibly does that, no style shows the same face twice, and a
committed pairing means a re-run reproduces the same casting.

The base images are **not in git** — ~82 MB of PNG, and regenerable. See
`design-system/models/README.md`. The generator fails with a clear message if
the directory is empty.

## Why a different model from the Worker

`gemini-3.1-flash-image` here; the Worker runs Flash-**Lite**. This is a one-off
batch that will sit in the catalogue for months, so it is worth more per image
than a render someone is waiting on. The Worker's model choice is a latency and
unit-cost decision; this one is not.

## Why the output is committed

Image generation is not deterministic. Re-running does not reproduce these
photographs — it produces different ones. Regenerating the catalogue costs
money, most of a day against the quota, and leaves the app looking subtly unlike
the build that was reviewed. So `catalogue/` is **source, not a build
artifact**. `.cache/` is the opposite and stays out.

## The quota, and why the run takes a day

Vertex allows **2 image requests/minute per base model**, project-wide. `global`
is the only endpoint this model is published on, so there is no region to escape
to and concurrency does not help — `DEFAULT_CONCURRENCY` is 2 for that reason.
A full 480-image run is roughly eight hours.

The script is built around that:

- **Resumable.** Jobs whose key already exists on disk are skipped, so a run
  that dies at image 300 never re-bills the first 299. Re-running is always
  safe.
- **A 429 is a doorway, not a failure.** It waits `QUOTA_WAIT_MS` (15s), up to
  `MAX_QUOTA_WAITS` (60), and does not count against the 3 attempts.
- **Failures are recorded**, to `.cache/failures.txt`, and the process exits
  non-zero. A run that stopped early must not read as one that finished.

## The backdrop check

`backdropDrift()` measures the rendered background against `#E7E1D8` —
`--placeholder` from the design system, the exact fill of the hatched plate the
picture lands in — and re-rolls past `BACKDROP_TOLERANCE`. A tile that shares
its ground with the plate behind it does not flash when it loads, and does not
punch a cold grey hole in warm paper.

Tiles are `sharp` crops of the **default colour's** renders, taken in a final
pass, not generated. A second call would cost as much as the first and would not
agree with it.

## The manifest

`manifest.ts` walks the same tree `upload.sh` uploads, so the two cannot
disagree about what exists. It publishes only styles with rendered art, and
validates against `catalogueResponseSchema` before writing — the last place a
broken manifest is free to catch.

`upload.sh` pushes it **after** the images, deliberately: a manifest uploaded
first advertises keys that are not in the bucket yet.

`catalogue.json` is the one mutable object in that bucket. Everything else is
written once and cached for a year. Withdrawing a cut therefore means ceasing to
list it, **never deleting its objects** — clients hold the manifest for 24h and
would show broken art for a day.

## Credentials

`secrets/loxa-cf.json`, git-ignored — the `loxa-cf` service account, holding
`roles/aiplatform.user` and nothing else. `GOOGLE_PROJECT_ID` and the key move
together or not at all. See the Google Cloud section of the root `CLAUDE.md`.
