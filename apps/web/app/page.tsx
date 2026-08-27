import { HAIR_COLORS, HAIR_STYLES, WEEKLY_CREDITS, WEEKLY_PRICE_LABEL } from "@loxa/shared";
import Link from "next/link";

/**
 * The landing page.
 *
 * Same system as the app — warm paper, one black, serif statements — so
 * somebody arriving from the App Store listing recognises where they are. The
 * catalogue below is read from `@loxa/shared`, which means the site cannot
 * advertise a style the app does not ship.
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-s6 py-s14">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-45)]">
        iOS
      </p>

      <h1 className="mt-s3 font-serif text-5xl leading-[1.02] tracking-[-0.015em] sm:text-6xl">
        Try on any hair
        <br />
        <span className="italic opacity-80">before the scissors.</span>
      </h1>

      <p className="mt-s5 max-w-[52ch] text-[15px] leading-relaxed text-[var(--ink-60)]">
        Photo in, new hair out. Colours, cuts and lengths on your own face in
        seconds — not a stock model with the haircut you were thinking about.
      </p>

      <div className="mt-s8 flex flex-wrap items-center gap-s4">
        <span className="inline-flex h-14 items-center rounded-pill bg-ink px-s6 text-[16px] font-medium text-paper">
          Coming to the App Store
        </span>
        <span className="font-mono text-[11px] text-[var(--ink-45)]">
          {WEEKLY_PRICE_LABEL} · {WEEKLY_CREDITS} photos a week · cancel anytime
        </span>
      </div>

      <section className="mt-s14">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-45)]">
          Hair styles
        </h2>
        <ul className="mt-s4 flex flex-wrap gap-s2">
          {HAIR_STYLES.map((style) => (
            <li
              key={style.id}
              className="rounded-pill border border-[var(--ink-12)] px-s4 py-s2 text-[13.5px]"
            >
              {style.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-s8">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-45)]">
          Hair colours
        </h2>
        <ul className="mt-s4 flex flex-wrap gap-s3">
          {HAIR_COLORS.map((color) => (
            <li key={color.id} className="flex items-center gap-s2 text-[13.5px]">
              <span
                aria-hidden
                className="inline-block h-5 w-5 rounded-pill"
                style={{ background: color.hex }}
              />
              {color.name}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-s14 flex gap-s5 border-t border-[var(--ink-09)] pt-s6 font-mono text-[11px] text-[var(--ink-45)]">
        <Link href="/privacy-policy" className="underline underline-offset-4">
          Privacy policy
        </Link>
        <Link href="/terms" className="underline underline-offset-4">
          Terms of use
        </Link>
      </footer>
    </main>
  );
}
