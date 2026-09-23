"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The before and after, as one photograph that changes while you watch.
 *
 * The page's one piece of motion, and it is spent here because this is the
 * whole pitch: the same face, new hair. The frame pins, and as the page
 * scrolls the new colour runs down the hair from the crown to the ends — root
 * to tip, the way colour is actually put on — while nothing else in the
 * picture moves. The edge is feathered rather than cut: a hard line reads as a
 * wipe between two pictures, and a soft one as colour taking. That stillness is the point, so the two photographs are
 * aligned on the pupils and the mouth (measured with Apple Vision, within two
 * pixels): `compare-before.jpg` is `before.jpg` scaled 1.111 and shifted onto
 * the render's framing, and both are cropped to the frame they share.
 *
 * Once it has run, the frame answers the gesture the app uses for the same
 * thing: press and hold to see the photo it started from.
 *
 * Without JavaScript, or with reduced motion asked for, there is no pin and no
 * scrub — the after is simply there, and press and hold still works.
 */
/** How far down the after has reached, with the feather past the bottom edge. */
const FEATHER = "7%";
const FULL = "107%";

export function RootToTip() {
  const scope = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(true);
  const [holding, setHolding] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        setRevealed(false);
        gsap.set(after.current, { "--reach": "0%" });

        gsap
          .timeline({
            scrollTrigger: {
              trigger: stage.current,
              start: "top top",
              end: "+=130%",
              pin: true,
              scrub: 0.5,
              onUpdate: (self) => setRevealed(self.progress > 0.5),
            },
          })
          .to(after.current, { "--reach": FULL, ease: "none" });

        return () => setRevealed(true);
      });
    },
    { scope },
  );

  const hold = (on: boolean) => setHolding(on);
  const showingAfter = revealed && !holding;

  return (
    <section ref={scope} aria-label="Before and after">
      <div
        ref={stage}
        className="mx-auto grid min-h-[100svh] max-w-5xl content-center items-center gap-s8 px-s6 py-s10 md:grid-cols-[0.9fr_1.1fr]"
      >
        <div>
          <h2 className="font-serif text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.015em]">
            Same face.
            <br />
            <span className="italic opacity-80">New hair.</span>
          </h2>
          <p className="mt-s5 max-w-[38ch] text-[15px] leading-relaxed text-[var(--ink-60)]">
            One photo went in. What came back kept the eyes, the jaw and the skin,
            and changed the one thing you asked it to.
          </p>
        </div>

        {/* Sized by height, so the caption and its "press and hold" stay on screen
            while the frame is pinned — smaller on a phone, where the heading sits above it. */}
        <figure className="mx-auto w-full max-w-[min(100%,calc(56svh*502/878))] md:max-w-[min(100%,calc(74svh*502/878))]">
          <button
            type="button"
            aria-label="Press and hold to see the photo it started from"
            aria-pressed={holding}
            onPointerDown={() => hold(true)}
            onPointerUp={() => hold(false)}
            onPointerLeave={() => hold(false)}
            onPointerCancel={() => hold(false)}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault();
                hold(true);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") hold(false);
            }}
            onBlur={() => hold(false)}
            onContextMenu={(e) => e.preventDefault()}
            className="relative block aspect-[502/878] w-full cursor-pointer select-none overflow-hidden rounded-card bg-placeholder [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          >
            <img
              src="/compare-before.jpg"
              alt="Before: her own photo, shoulder-length brown hair."
              width={502}
              height={878}
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              ref={after}
              className="absolute inset-0 transition-opacity duration-150"
              style={
                {
                  "--reach": FULL,
                  opacity: holding ? 0 : 1,
                  maskImage: `linear-gradient(to bottom, #000 calc(var(--reach) - ${FEATHER}), transparent var(--reach))`,
                  WebkitMaskImage: `linear-gradient(to bottom, #000 calc(var(--reach) - ${FEATHER}), transparent var(--reach))`,
                } as React.CSSProperties
              }
            >
              <img
                src="/compare-after.jpg"
                alt="After: the same face, long honey-blonde hair with a curtain bang."
                width={502}
                height={878}
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
          </button>

          <figcaption className="flex items-baseline justify-between gap-s4 pt-s3 font-mono text-[10px] tracking-[0.14em] text-[var(--ink-45)] uppercase">
            <span>{showingAfter ? "After · one credit" : "Before"}</span>
            <span>Press and hold</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
