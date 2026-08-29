# The mark

`loxa-mark.svg` is the Loxa mark: a profile with hair, one filled shape, no
strokes and no second colour. Its viewBox is the silhouette's own bounding box
(747 x 1000) and its fill is `currentColor`, so a caller sets a height and a
colour and gets nothing else to decide.

It is never drawn in outline, never given a background of its own inside the
app, and never used at a size where the face notch closes up — below about 20px
tall it stops being a profile and becomes a blob. The lockup is the mark, a gap
of 0.42em, then LOXA in Instrument Serif tracked to 0.24em.

## Where the copies live

Nothing imports this folder, the same as the rest of the system, so the mark has
mirrors and they move together in one commit:

| Copy | What it is |
|---|---|
| `apps/web/components/Mark.tsx` | The path inline, as a React component. |
| `apps/web/app/icon.svg` | The favicon: the mark on paper, inset 17%. |
| `apps/web/app/apple-icon.png` | The same, 180px, for the iOS home screen. |
| `apps/web/app/opengraph-image.png` | The share card, 1200 x 630, rendered from `loxa-og.svg`. |
| `apps/mobile/assets/mark.png` | Black on transparency, tinted at use. |
| `apps/mobile/assets/icon.png` | The app icon: ink on paper, 1024px. |
| `apps/mobile/assets/splash-icon.png` | The mark alone; the splash paints the paper. |

Regenerating a raster copy needs only `rsvg-convert`, which renders the height
you ask for and lets the width follow:

```bash
sed 's/currentColor/#0d0c0b/' loxa-mark.svg > /tmp/mark.svg
rsvg-convert -h 240 /tmp/mark.svg -o mark.png
```

The app icon is that render centred on `#faf8f5` at 62% of the canvas height —
iOS crops a square to a rounded rectangle, and a mark drawn to the edges loses
its hair to the corner radius.

## The share card

`loxa-og.svg` is the lockup and the headline on paper at 1200 x 630, the size
every social preview crops from. Its letters are **outlines, not text**: a share
card is rendered on whatever machine happens to have the tools installed, and a
missing Instrument Serif would silently substitute a system serif rather than
fail. Outlines cost a larger file and can no longer be edited as words, which is
the right trade for a file that changes about once a year.

```bash
rsvg-convert -w 1200 -h 630 loxa-og.svg -o ../../apps/web/app/opengraph-image.png
```

Next reads that filename by convention and needs `metadataBase` in
`apps/web/app/layout.tsx` to turn it into an absolute URL. The alt text sits
beside it in `opengraph-image.alt.txt`.
