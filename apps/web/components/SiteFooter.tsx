import Link from "next/link";
import { CONTACT_EMAIL } from "../app/legal-details";
import { Wordmark } from "./Wordmark";

/**
 * The legal links live here on every page.
 *
 * All three URLs also go into App Store Connect — privacy and terms into their
 * own fields and into the app's own screens (see `apps/mobile/src/legal.ts`),
 * and support into the Support URL field, which will not take a `mailto:`. So
 * they have to keep resolving.
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
          <Link href="/support" className="underline underline-offset-4 hover:text-ink">
            Support
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline underline-offset-4 hover:text-ink"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
