import { cn } from "@/lib/utils";

/**
 * Where a photograph will go — and, once there is one, where it goes.
 *
 * The design system's diagonal hatch, so an empty slot reads as *a picture
 * belongs here* rather than as an image that failed to load. Most visuals on
 * this site are still one of these, which is deliberate, and why they are
 * labelled.
 *
 * `photo` paints over the hatch as a background layer rather than as an
 * `<img>`: a URL that 404s then simply does not paint, and the placeholder is
 * what remains. The catalogue is generated a few pictures an hour, so a key
 * that is not there yet is the normal case rather than the broken one.
 */
export function Hatch({
  label,
  className,
  dark,
  photo,
}: {
  label?: string;
  className?: string;
  dark?: boolean;
  photo?: string;
}) {
  const hatch = `repeating-linear-gradient(102deg, ${
    dark ? "rgba(255,255,255,.07)" : "rgba(13,12,11,.07)"
  } 0 12px, transparent 12px 26px)`;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        dark ? "bg-night-raised" : "bg-placeholder",
        className,
      )}
      style={{
        backgroundImage: photo ? `url("${photo}"), ${hatch}` : hatch,
        backgroundSize: photo ? "cover, auto" : undefined,
        backgroundPosition: photo ? "center, center" : undefined,
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
