import { cn } from "@/lib/utils";

/**
 * LOXA.
 *
 * Instrument Serif, uppercase, tracked to 0.24em — the one lockup the design
 * system defines, and the same treatment the app uses on its entry screen and
 * in the preview header. The tracking is what makes four letters read as a mark
 * rather than as a word someone forgot to style.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-serif leading-none tracking-[0.24em] select-none", className)}
      aria-label="Loxa"
    >
      LOXA
    </span>
  );
}
