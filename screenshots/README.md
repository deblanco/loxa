# Screenshots

Every screen the app has, walked in flow order on the iPhone 17 Pro Max
simulator (iOS 26.5) and captured at the full 1320 x 2868 framebuffer.

Taken 1 September 2026, against `main` at the compliance commits — so these
show the auto-renewal disclosure, Restore on both paywalls, and the result
screen's original-photo inset.

## How they were taken

Driven through the Orca CLI (`orca emulator tap` / `gesture` / `ax`), reading
the accessibility tree to find each control rather than guessing coordinates.
`orca emulator` has no screenshot subcommand and `exec` is broken on this build
(the bridge injects a `-d` that serve-sim rejects), so the frames come from the
MJPEG stream the bridge already exposes — one complete JPEG pulled off
`streamUrl`, which `orca emulator list --json` reports.

## The screens

| # | File | What it shows |
|---|---|---|
| 01-03 | `entry-carousel*` | The three onboarding clips, before anything is asked for |
| 04 | `onboarding-offer` | The hard paywall. **Renewal disclosure and Restore, both new** |
| 05 | `preview-empty` | A fresh install: 0 credits, no portrait |
| 06 | `profile-free-plan` | Free plan, Subscribe rather than Manage |
| 07 | `language` | The five languages |
| 08 | `paywall-out-of-credits` | **Renewal disclosure, Restore, both prices, Terms · Privacy** |
| 09 | `profile-subscribed` | Loxa Weekly, with Manage |
| 10 | `preview-with-credits` | 20 credits, style strip, colour strip |
| 11 | `camera` | Shutter, flip, choose-from-library |
| 12-13 | `photo-library-picker`, `photo-crop` | The system picker and its 9:16 crop |
| 14 | `confirm` | The model large, your own photo as the inset |
| 15 | `generating` | The progress bar and the selection summary |
| 16 | `result-with-portrait-offer` | The result, with "Use this photo on your profile?" |
| 17 | `result` | **The result proper — inset bottom-right, no fades, restyled header** |
| 18 | `result-hold-to-compare` | **Holding shows the real original photo, not a hatch** |
| 19 | `rating-prompt` | Apple's review sheet, which fires 1.5s after a look lands |
| 20 | `result-platinum` | A second cut/colour, for comparison |

## Notes for whoever reviews these

- **05 and 10 are the same screen** at 0 credits and at 20. The chip is the only
  difference, and it is worth seeing both: a `null` balance also renders as `0`,
  which is a known wart rather than this state.
- **08 shows the non-introductory copy.** StoreKit cannot answer in a simulator,
  so the pricing falls back — and the fallback deliberately no longer claims
  first-week eligibility it cannot verify. On a device, an eligible reader sees
  the "$0.99 for the first week" variant instead.
- **The prices in 08 are the shipped labels, not storefront prices**, for the
  same reason. On a device both come from StoreKit in the reader's own currency.
- **15 needed an uncached render to exist at all.** A repeat of the same photo,
  cut and colour is a cache hit and lands on the result in well under a second,
  so the first attempt caught 16 instead.
- The face in these is a simulator sample photo, not a real user's.
