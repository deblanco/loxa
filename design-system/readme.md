# Loxa — the design system

Warm paper, one black, editorial serif. The app is a photo viewer with controls
on it, and the controls are meant to get out of the way of the photo.

Open `Loxa Try-On.dc.html` in a browser. It is the whole app as a click-through
prototype and it is the argument-settler: if a screen here disagrees with a
screen there, this folder is wrong and should be fixed, not worked around.
`wireframes.png` is the flow and the business rules it was drawn from.

## How this folder is used

Nothing imports it. The system is CSS and the app is React Native, so there are
two hand-maintained mirrors:

| Mirror | What it is |
|---|---|
| `apps/mobile/src/theme.ts` | The RN mirror. The only file in the app allowed raw hex. |
| `apps/web/app/globals.css` | The web mirror, as Tailwind v4 `@theme` variables. |

**A token change updates `tokens/*.css` and both mirrors in the same commit.**
A colour that exists in only one of the three is a bug in the other two.

## Fundamentals

**Colour.** Paper `#faf8f5` and ink `#0d0c0b`. That is the palette. There is no
accent and no second black — the filled pill, the credit chip, the toggle, the
sheet's primary option and the selected style's ring are all the same ink. Two
screens invert to `--night` because they show a photograph full-bleed and a
photograph needs a dark room: the result and the camera. The entry carousel is
night for the same reason.

Reduced ink is always the ink at an opacity, never a lighter grey. The paper is
warm and a cold grey on top of it reads as dirt.

**Type.** Three faces, three jobs, no overlap.

- *Instrument Serif* states things: headlines, prices, the credit count, the
  wordmark. Never a button, never a label.
- *Instrument Sans* runs the interface: buttons, body, rows, tiles.
- *Mono*, uppercase and letterspaced `0.14em`, carries meta: section headers
  ("HAIR STYLES"), counts, technical asides. The letterspacing is what makes it
  read as an annotation instead of as text — a mono label without it just looks
  like a font mistake.

**Shape.** Controls are pills (`999px`). Containers are 12–26px. Nothing is
square. Every un-shot image wears the diagonal hatch from `--hatch-light` /
`--hatch-dark`, so an empty state reads as *a picture goes here* rather than as
a failure.

**Depth.** One shadow, `--shadow-control`, and it only ever goes under a black
control sitting on paper — otherwise the black pill looks printed on. Surfaces
do not stack with shadow; they separate with a hairline border and a warmer fill.

**Motion.** Either a state change (180–350ms, eased) or ambience (seconds,
linear, looping). Nothing in between and nothing bounces. The four ambient
loops — the entry carousel's crossfade, the trial screen's drifting masonry, the
generating plate's shimmer, and the camera's landmark sweep — are the only
things on screen that move without being touched.

## Layout constants

Screen gutter is 16px and text inside a card is inset to 18–20px: text always
sits further in than the plate it is on. Every screen starts 60px from the top
(clear of the status bar) and ends 34px from the bottom (clear of the home
indicator).

The generated image is **2:3**, `1024 × 1536`. That ratio is in the Vertex
adapter, in the preview plate, and in the result screen, and they have to agree.

## Voice

Plain, short, second person, and never coy about money. "20 photos a week,
cancel anytime." "Out of credits until Monday." "1 credit" is printed on the Try
On button *before* it is pressed, because the moment to tell someone a thing
costs something is before they buy it.

Never promise a haircut will suit them. The app shows what a style looks like on
their face; the judgement stays theirs.

## Known gaps

- Real footage for the entry carousel and real thumbnails for the style strip.
  Everything ships as a labelled placeholder until then.
- A style taxonomy (length / texture / bang) so the strip can filter. The header
  already says "All 24"; there is nothing behind it yet.
- A gallery of past generations on the profile. Local-only in v1.
