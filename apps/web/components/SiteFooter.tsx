import Link from "next/link";
import { Wordmark } from "./Wordmark";

/**
 * The legal links live here on every page.
 *
 * Both URLs also go into App Store Connect and into the app's own screens, so
 * they have to keep resolving — see `apps/mobile/src/legal.ts`.
 */
export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-5xl px-s6 pt-s10 pb-s14">
      <div className="flex flex-wrap items-center justify-between gap-s4 border-t border-[var(--ink-09)] pt-s6">
        <Link href="/" className="text-[15px] text-[var(--ink-45)]">
          <Wordmark />
        </Link>
        <div className="flex gap-s5 font-mono text-[11px] text-[var(--ink-45)]">
          <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-ink">
            Privacy policy
          </Link>
          <Link href="/terms" className="underline underline-offset-4 hover:text-ink">
            Terms of use
          </Link>
          <a
            href="mailto:hola@blankhexadecimal.com"
            className="underline underline-offset-4 hover:text-ink"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
