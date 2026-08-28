# Model roster

Nineteen synthetic studio portraits, used as the base photographs for the
generated style catalogue. Nothing in the app ships these files — they are the
input to `tools/generate-previews`, which renders each cut and colour onto two
of them and uploads the results to R2.

**The images themselves are not in git.** They are ~82 MB of PNG and they are
regenerable, so `.gitignore` keeps them out and this file records what should be
here. The generator fails with a clear message if the directory is empty.

## The files

`{ethnicity}-{ageband}[-variant].png`, 1728 × 2304 (3:4), a bust on a cool grey
seamless, front on, neutral expression, bare shoulders cropped near the
collarbone.

```
black-13-17          east-asian-18-24     middle-eastern-25-34  white-13-17
black-18-24          east-asian-18-24-2   middle-eastern-35-44  white-25-34
black-35-44          east-asian-45-54     south-asian-18-24     white-35-44
latina-13-17         latina-25-34         south-asian-45-54     white-55-64
latina-18-24-street  latina-35-44         southeast-asian-45-54
```

Two things about the names:

- **The age band is a label from the source set, not a fact about the picture.**
  The three `13-17` files read as ambiguous rather than clearly adult. They are
  synthetic, so no real person is depicted, but the label should not be treated
  as a claim. `roster.json` gives each of them a single slot out of forty-eight.
- **`latina-18-24-street` is the odd one out** — a full-body lifestyle frame at
  1536 × 2752, not a studio bust. The head is a small part of it, so a preview
  cropped from it is softer than the rest. It also gets one slot.

## Pairing

`tools/generate-previews/roster.json` decides which two models wear each cut.
It is committed rather than drawn at random so a re-run reproduces the same
catalogue, and hand-written rather than generated so the pairing makes sense:
the coil and loc styles go to models whose hair plausibly does that, and no cut
shows the same face twice.
