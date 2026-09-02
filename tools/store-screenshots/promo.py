"""
The subscription's promotional image, 1024 x 1024.

App Store Connect shows this on offer-code redemption pages and win-back
offers, and `asc web review subscriptions attach-group` reports the
subscription as MISSING_METADATA without it — Apple's documentation calls it
optional, Apple's own attach preflight does not.

Deliberately carries no price. Prices are per storefront and change; a number
burned into an image is a number that goes wrong quietly. What the image has to
say is what the subscription *is*: the catalogue, and how much of it a week
buys.

Built from the same served art as screenshot 05, so it cannot show a cut the
app does not ship.
"""

import base64
import json
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(ROOT, "..", "..", "screenshots", "store"))
ART = os.path.join(OUT, ".art")
SCRATCH = tempfile.mkdtemp(prefix="loxa-promo-")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Four across, three down. The fourth row was there and came out worse: the
# band has to sit on solid ground rather than fade through a row of faces, or
# the bottom row reads as a rendering fault rather than a design.
COLS, ROWS = 4, 3
GRID = COLS

manifest = json.load(open(os.path.join(ART, "catalogue.json")))
colors = [c["id"] for c in manifest["colors"]]

cells = []
for i, style in enumerate(manifest["styles"][: COLS * ROWS]):
    path = os.path.join(ART, f"{style['id']}.jpg")
    if not os.path.exists(path):
        continue
    wanted = colors[i % len(colors)]
    entry = next((c for c in style["colors"] if c["id"] == wanted), style["colors"][0])
    focus = manifest["focus"].get(entry["heroes"][0], {"top": 0.2, "bottom": 0.65})
    pos = round((focus["top"] + focus["bottom"]) / 2 * 100, 1)
    b64 = base64.b64encode(open(path, "rb").read()).decode()
    cells.append(
        f'<div class="cell"><img src="data:image/jpeg;base64,{b64}" '
        f'style="object-position:50% {pos}%"></div>'
    )

HTML = """<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1024px;height:1024px;overflow:hidden}
body{background:#faf8f5;font-family:'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{position:relative;width:1024px;height:1024px}
.grid{position:absolute;left:0;right:0;top:0;height:768px;display:grid;
  grid-template-columns:repeat(%(n)s,1fr);grid-template-rows:repeat(3,1fr)}
.cell{overflow:hidden;background:#e7e1d8}
.cell img{width:100%%;height:100%%;object-fit:cover;display:block}
/* The band is the brand: paper over the catalogue, the way every sheet in the
   app sits over a wall of photographs. */
.band{position:absolute;left:0;right:0;bottom:0;height:256px;padding:52px 64px 0;background:#faf8f5}
h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:86px;
  line-height:1;letter-spacing:-0.015em;color:#0d0c0b}
h1 i{opacity:.72}
p{margin-top:16px;font-size:29px;color:rgba(13,12,11,0.6);letter-spacing:-0.005em}
</style></head><body>
<div class="wrap">
  <div class="grid">%(cells)s</div>
  <div class="band">
    <h1>Loxa Weekly</h1>
    <p>Twenty photos a week, on your own face.</p>
  </div>
</div></body></html>""" % {"n": GRID, "cells": "".join(cells)}

page = os.path.join(SCRATCH, "promo.html")
open(page, "w").write(HTML)
out = os.path.join(OUT, "subscription-promo.png")
subprocess.run(
    [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
     "--force-device-scale-factor=1", "--window-size=1024,1024",
     f"--screenshot={out}", "--virtual-time-budget=8000", f"file://{page}"],
    check=True, capture_output=True,
)
print(out, os.path.getsize(out), "bytes,", len(cells), "cells")
