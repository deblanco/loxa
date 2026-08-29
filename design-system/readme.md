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

`logo/` holds the mark and the same rule applies to it — its copies, including
the app icon and the favicon, are listed in `logo/README.md`.

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

The style strip and the preview plate now show generated photographs, and they
are shot on `--placeholder` — the same fill the hatch sits on. A tile that has
loaded and a tile that has not therefore share a ground, so the strip settles
instead of flashing, and a build with no asset host falls back to the hatch
rather than to broken images.

**Depth.** One shadow, `--shadow-control`, and it only ever goes under a black
control sitting on paper — otherwise the black pill looks printed on. Surfaces
do not stack with shadow; they separate with a hairline border and a warmer fill.

**Motion.** Either a state change (180–350ms, eased) or ambience (seconds,
linear, looping). Nothing in between and nothing bounces. The four ambient
loops — the entry carousel's crossfade, the trial screen's drifting masonry, the
generating plate's shimmer, and the camera's landmark sweep — are the only
things on screen that move without being touched.

Still four. Each cut is photographed on two models, and the strip picks which of
the two it shows when it mounts — so the catalogue looks different between
sessions without a fifth loop running under twenty-four tiles at once.

## Layout constants

Screen gutter is 16px and text inside a card is inset to 18–20px: text always
sits further in than the plate it is on. Every screen starts 60px from the top
(clear of the status bar) and ends 34px from the bottom (clear of the home
indicator).

The generated image is **9:16**, `1080 × 1920`. That ratio is in the Vertex
adapter, in the preview plate, and in the result screen, and they have to agree. The
catalogue previews are generated at the same size, for the same reason.

The preview plate is a pager: the user's own photograph first, then the models
wearing the selected cut and colour. It carries the dots and the `swipe for
models` hint. It does not carry the prototype's prev/next arrows — those exist
so the prototype can be clicked through in a browser, and a thumb on a phone
already has the gesture.

## Voice

Plain, short, second person, and never coy about money. "20 photos a week,
cancel anytime." "Out of credits until Monday." "1 credit" is printed on the Try
On button *before* it is pressed, because the moment to tell someone a thing
costs something is before they buy it.

Never promise a haircut will suit them. The app shows what a style looks like on
their face; the judgement stays theirs.

**When a photo is turned away**, the line replaces the viewfinder hint it sits
in — same place, same shape, one lowercase clause and then what to do about it.
It says what is wrong with the photo, never what is wrong with the person.

| Reason | Line |
|---|---|
| No face found | `no face in that one · try again` |
| More than one face | `more than one face · one at a time` |
| Too small or too soft | `too small or too soft · try a closer photo` |

The check runs on the device, on the photo, before the render is paid for — the
alternative is a spent credit, a refund, and a progress bar that ends in
nothing. On the main screen the same line goes on the plate: as its label when
there is no photo, and on the badge's plate over one there is.

## Known gaps

- Real footage for the entry carousel. The three clips on the entry screen are
  still labelled placeholders.
- A style taxonomy (length / texture / bang) so the strip can filter. The
  catalogue is 24 cuts now, which is what the header always claimed, but there
  is still nothing to filter it by.
- A gallery of past generations on the profile. Local-only in v1.
