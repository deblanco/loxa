import Link from "next/link";
import { Wordmark } from "./Wordmark";

/** The same bar on every page, so the mark is never more than a glance away. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-s6 py-s6">
      <Link href="/" className="text-[19px]">
        <Wordmark />
      </Link>
      <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--ink-45)] uppercase">
        iOS
      </span>
    </header>
  );
}
