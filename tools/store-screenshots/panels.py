"""
The App Store panels: a statement at the top, the screen itself below.

Replaces the earlier layout, which floated a small phone in a large field of
paper. On the store the gallery is read at thumbnail size, in a scrolling row,
against a dark chrome — a screenshot at 72% of the panel width is unreadable
there, and the panel ends up selling the typography rather than the app. Here
the capture runs to the edges and past the bottom, so the thumbnail is mostly
*app*, and the statement is the one thing that has to survive the shrinking.

Everything below the statement is a real, unretouched capture at the device's
own 1320 x 2868 — never upscaled, never mocked up, never composited. The frames
come from `screenshots/new/`, taken on a 6.9" simulator against the production
API, which is why a capture and a panel are the same pixels.

Run: python3 tools/store-screenshots/panels.py
Needs Google Chrome (headless) and a network connection for the two webfonts.
"""

import base64
import os
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..", "screenshots")
SRC = f"{ROOT}/new"
OUT = f"{ROOT}/store-v2"
os.makedirs(OUT, exist_ok=True)
SCRATCH = tempfile.mkdtemp(prefix="loxa-panels-")

W, H = 1320, 2868

# The order is the argument, and it is the answer to 4.3(b): what the app does,
# then the thing no other hair app in the category does, then the proof, then
# the breadth. A reviewer who reads only the first two should already know why
# this is not the app it was mistaken for.
PANELS = [
    dict(
        n="01",
        img="preview-final.png",
        bg="#faf8f5",
        head="Try on any hair",
        headItalic="before the scissors.",
        # The crop starts below the status bar. The clock and the battery in a
        # capture are not the reader's, and two sets on one screen read as a
        # mistake — 150 clears the dynamic island as well as the text.
        top=150,
    ),
    dict(
        n="02",
        img="faceclip.png",
        bg="#f2ede6",
        head="It reads your face",
        headItalic="on the phone.",
        top=150,
    ),
    dict(
        n="03",
        img="suits-answer.png",
        bg="#efe9e0",
        head="Then it says which cuts",
        headItalic="suit you, and why.",
        top=150,
    ),
    dict(
        n="04",
        img="result-final.png",
        bg="#f6f3ee",
        head="It hands back",
        headItalic="your own face.",
        top=150,
    ),
    dict(
        n="05",
        img="result-pixie.png",
        bg="#efe9e0",
        head="Same face.",
        headItalic="Any cut, any colour.",
        top=150,
    ),
]

TPL = """<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:%(W)spx;height:%(H)spx;overflow:hidden}
body{background:%(bg)s;-webkit-font-smoothing:antialiased}
.wrap{position:relative;width:%(W)spx;height:%(H)spx}
h1{position:absolute;top:118px;left:0;right:0;text-align:center;
   font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:112px;line-height:1.02;
   letter-spacing:-0.02em;color:#0d0c0b}
h1 i{display:block;opacity:.66}
/* The capture is anchored to the bottom of the panel and cut off there: the
   panel is a window onto the screen, not a photograph of a phone on a table.
   Only the top corners are rounded, because the bottom edge is a cut, not an
   end — a rounded corner there would say the screen stops, and it does not.

   The arithmetic, so the next person can move it safely: at 1128 wide a
   1320 x 2868 capture is 2450 tall, less the 150 cropped off the status bar,
   so 2300 is visible. The window is 2868 - `top`, and whatever the image has
   left over spills past the bottom edge and is clipped. Raising `top` shows
   more of the screen; lowering it crops more off the bottom. */
.shot{position:absolute;left:50%%;transform:translateX(-50%%);top:760px;bottom:0;width:1128px;
   border-radius:64px 64px 0 0;overflow:hidden;
   box-shadow:0 48px 110px rgba(13,12,11,.22),0 6px 24px rgba(13,12,11,.10)}
.shot img{display:block;width:100%%;margin-top:-%(top)spx}
</style></head><body>
<div class="wrap">
  <h1>%(head)s<i>%(headItalic)s</i></h1>
  <div class="shot"><img src="data:image/png;base64,%(b64)s"></div>
</div></body></html>"""

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def render(html: str, out: str) -> None:
    page = os.path.join(SCRATCH, os.path.basename(out) + ".html")
    with open(page, "w") as fh:
        fh.write(html)
    subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            f"--window-size={W},{H}",
            "--default-background-color=00000000",
            # The fonts are fetched, so the shot has to wait for them: without
            # this the serif lands as a fallback and the panel ships in Georgia.
            "--virtual-time-budget=6000",
            f"--screenshot={out}",
            f"file://{page}",
        ],
        check=True,
        capture_output=True,
    )


def main() -> None:
    for panel in PANELS:
        src = os.path.join(SRC, panel["img"])
        if not os.path.exists(src):
            raise SystemExit(f"missing capture: {src}")
        with open(src, "rb") as fh:
            b64 = base64.b64encode(fh.read()).decode()
        out = os.path.join(OUT, f"{panel['n']}.png")
        render(TPL % {**panel, "b64": b64, "W": W, "H": H}, out)
        print(f"  {panel['n']}  {panel['head']} {panel['headItalic']}  <- {panel['img']}")
    print(f"\n{len(PANELS)} panels in {OUT}")


if __name__ == "__main__":
    main()
