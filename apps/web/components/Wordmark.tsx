import { cn } from "@/lib/utils";
import { Mark } from "./Mark";

/**
 * The lockup: the mark, then LOXA.
 *
 * Instrument Serif, uppercase, tracked to 0.24em — the one lockup the design
 * system defines, and the same treatment the app uses on its entry screen and
 * in the preview header. The tracking is what makes four letters read as a mark
 * rather than as a word someone forgot to style.
 *
 * Everything is sized in `em`, so setting a font size on the caller sizes the
 * mark with it and the two never drift apart.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.42em] font-serif leading-none tracking-[0.24em] select-none",
        className,
      )}
      aria-label="Loxa"
    >
      <Mark className="h-[1.3em] w-auto shrink-0" />
      <span aria-hidden="true">LOXA</span>
    </span>
  );
}
