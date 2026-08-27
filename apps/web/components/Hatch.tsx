import { cn } from "@/lib/utils";

/**
 * Where a photograph will go.
 *
 * The design system's diagonal hatch, so an empty slot reads as *a picture
 * belongs here* rather than as an image that failed to load. Every visual on
 * this site is one of these until the shoot happens — which is deliberate, and
 * why they are labelled.
 */
export function Hatch({
  label,
  className,
  dark,
}: {
  label?: string;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        dark ? "bg-night-raised" : "bg-placeholder",
        className,
      )}
      style={{
        backgroundImage: `repeating-linear-gradient(102deg, ${
          dark ? "rgba(255,255,255,.07)" : "rgba(13,12,11,.07)"
        } 0 12px, transparent 12px 26px)`,
      }}
    >
      {label ? (
        <span
          className={cn(
            "px-s4 text-center font-mono text-[10.5px] leading-relaxed tracking-[0.08em]",
            dark ? "text-[rgba(250,248,245,.5)]" : "text-[var(--ink-45)]",
          )}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
