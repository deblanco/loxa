"""
The App Store screenshots, built from the raw simulator captures.

One panel per frame: a warm-paper ground, an Instrument Serif statement, and
the phone below it — the same system as the app and the marketing site, so a
reader arriving from the listing recognises where they are.

Output is 1320 x 2868, which is the iPhone 6.9" size App Store Connect asks
for and also the framebuffer the raw captures were taken at, so the phone
image is never resampled up.

Run: python3 tools/store-screenshots/generate.py
Needs Google Chrome (headless) and a network connection for the two webfonts.
"""

import base64, os, subprocess, tempfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "screenshots")
OUT = f"{ROOT}/store"
os.makedirs(OUT, exist_ok=True)
SCRATCH = tempfile.mkdtemp(prefix="loxa-store-")

PANELS = [
    dict(n="01", img="10-preview-with-credits.jpg", bg="#faf8f5", fg="#0d0c0b", sub="rgba(13,12,11,0.6)",
         head="Try on any hair<br><i>before the scissors.</i>",
         subline="Your photo goes in. The same face comes back, restyled."),
    dict(n="02", img="17-result.jpg", bg="#f2ede6", fg="#0d0c0b", sub="rgba(13,12,11,0.6)",
         head="It hands back<br><i>your own face.</i>",
         subline="Not a model wearing the haircut you were thinking about."),
    dict(n="03", img="18-result-hold-to-compare.jpg", bg="#e7e1d8", fg="#0d0c0b", sub="rgba(13,12,11,0.6)",
         head="Hold to see<br><i>the before.</i>",
         subline="The difference, on you — not on somebody else."),
    dict(n="04", img="20-result-platinum.jpg", bg="#f6f3ee", fg="#0d0c0b", sub="rgba(13,12,11,0.6)",
         head="One face.<br><i>Every look.</i>",
         subline="Change the cut, change the colour, and go again."),
]

# The catalogue panel. Not a phone: a grid of the served preview art, one cut
# per cell with the colour rotating through all ten, so the panel shows both
# axes of the catalogue at once. Built from `gallery.json`, which is written
# from `GET /v1/catalogue` — the same manifest the app reads, so this can never
# advertise a cut the app does not ship.
GALLERY = dict(n="05", bg="#f6f3ee", fg="#0d0c0b", sub="rgba(13,12,11,0.6)",
               head="24 cuts.<br><i>10 colours.</i>",
               subline="The whole catalogue \u2014 240 combinations, all on your own face.")

TPL = """<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1320px;height:2868px;overflow:hidden}
body{background:%(bg)s;font-family:'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{position:relative;width:1320px;height:2868px;padding:150px 104px 0}
h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:132px;line-height:1.0;
   letter-spacing:-0.018em;color:%(fg)s}
h1 i{opacity:.72}
p{margin-top:44px;font-size:41px;line-height:1.35;color:%(sub)s;max-width:22ch;letter-spacing:-0.005em}
.phone{position:absolute;left:50%%;transform:translateX(-50%%);top:900px;width:952px;
   border-radius:76px;overflow:hidden;box-shadow:0 60px 120px rgba(13,12,11,.20),0 8px 28px rgba(13,12,11,.10);
   outline:3px solid rgba(13,12,11,.10);outline-offset:-3px}
.phone img{display:block;width:100%%}
</style></head><body>
<div class="wrap">
  <h1>%(head)s</h1>
  <p>%(subline)s</p>
  <div class="phone"><img src="data:image/jpeg;base64,%(b64)s"></div>
</div></body></html>"""

GALLERY_TPL = """<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1320px;height:2868px;overflow:hidden}
body{background:%(bg)s;font-family:'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{position:relative;width:1320px;height:2868px;padding:150px 104px 0}
h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:132px;line-height:1.0;
   letter-spacing:-0.018em;color:%(fg)s}
h1 i{opacity:.72}
p{margin-top:44px;font-size:41px;line-height:1.35;color:%(sub)s;max-width:22ch;letter-spacing:-0.005em}
.phone{position:absolute;left:50%%;transform:translateX(-50%%);top:900px;width:952px;height:1968px;
   border-radius:76px;overflow:hidden;background:#faf8f5;padding:28px 24px 0;
   box-shadow:0 60px 120px rgba(13,12,11,.20),0 8px 28px rgba(13,12,11,.10);
   outline:3px solid rgba(13,12,11,.10);outline-offset:-3px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.cell{aspect-ratio:3/4;border-radius:22px;overflow:hidden;background:#e7e1d8}
.cell img{width:100%%;height:100%%;object-fit:cover;display:block}
</style></head><body>
<div class="wrap">
  <h1>%(head)s</h1>
  <p>%(subline)s</p>
  <div class="phone"><div class="grid">%(cells)s</div></div>
</div></body></html>"""

API = "https://loxa-api.blankhexadecimal.com/v1/catalogue"
ASSETS = "https://loxa-assets.blankhexadecimal.com"
ART = os.path.join(OUT, ".art")

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def fetch(url, path):
    """curl, not urllib: the bucket's custom domain 403s urllib's user agent."""
    if not os.path.exists(path):
        subprocess.run(["curl", "-sfL", url, "-o", path], check=True)
    return path


def catalogue_art():
    """One hero per cut, the colour rotating through all ten.

    Read from the manifest the app itself reads, so the panel can only show
    cuts and colours that are actually published. `focus` gives the vertical
    centre of the head in each frame, which is what keeps a 3:4 crop off the
    chin.
    """
    os.makedirs(ART, exist_ok=True)
    import json
    manifest = json.load(open(fetch(API, os.path.join(ART, "catalogue.json"))))
    colors = [c["id"] for c in manifest["colors"]]
    rows = []
    for i, style in enumerate(manifest["styles"]):
        wanted = colors[i % len(colors)]
        entry = next((c for c in style["colors"] if c["id"] == wanted), style["colors"][0])
        key = entry["heroes"][0]
        path = fetch(f"{ASSETS}/{key}", os.path.join(ART, f"{style['id']}.jpg"))
        focus = manifest["focus"].get(key, {"top": 0.2, "bottom": 0.65})
        rows.append({"file": path, "center": (focus["top"] + focus["bottom"]) / 2})
    return rows


def shoot(html, name):
    hp = f"{SCRATCH}/panel-{name}.html"
    open(hp, "w").write(html)
    outpng = f"{OUT}/{name}.png"
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=1320,2868",
                    f"--screenshot={outpng}", "--virtual-time-budget=8000", f"file://{hp}"],
                   check=True, capture_output=True)
    print(name, os.path.getsize(outpng))

for p in PANELS:
    b64 = base64.b64encode(open(f"{ROOT}/{p['img']}", "rb").read()).decode()
    shoot(TPL % {**p, "b64": b64}, p["n"])

# The catalogue grid. Its art is the served preview art, fetched once into
# `.art/` and reused — the bucket's objects are immutable, so a cached copy
# cannot go stale without its key changing.
cells = []
for row in catalogue_art():
    b64 = base64.b64encode(open(row["file"], "rb").read()).decode()
    cells.append(
        f'<div class="cell"><img src="data:image/jpeg;base64,{b64}" '
        f'style="object-position:50% {round(row["center"] * 100, 1)}%"></div>'
    )
shoot(GALLERY_TPL % {**GALLERY, "cells": "".join(cells)}, GALLERY["n"])
