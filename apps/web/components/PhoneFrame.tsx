import { DEFAULT_COLOR_ID, DEFAULT_STYLE_ID, HAIR_COLORS, findColor, findStyle } from "@loxa/shared";
import { Hatch } from "./Hatch";
import { Wordmark } from "./Wordmark";

/**
 * The app's preview screen, at rest.
 *
 * Not a screenshot — a rebuild from the same tokens and the same catalogue, so
 * it cannot drift out of date the way a PNG does. Change a colour in
 * `@loxa/shared` and the swatches here change with it.
 *
 * Its job on this page is to answer "what is this thing" in one glance, which a
 * headline alone cannot do for a product nobody has seen.
 */
export function PhoneFrame() {
  const style = findStyle(DEFAULT_STYLE_ID);
  const color = findColor(DEFAULT_COLOR_ID);

  return (
    <div className="w-full max-w-[272px] rounded-[46px] border border-[var(--ink-12)] bg-paper p-s3 shadow-[0_24px_60px_rgba(13,12,11,.14)]">
      <div className="overflow-hidden rounded-[34px] bg-paper">
        <div className="flex items-center justify-between px-s4 pt-s5 pb-s3">
          <Wordmark className="text-[15px]" />
          <div className="flex items-center gap-s2">
            <span className="flex items-center gap-1.5 rounded-pill bg-ink px-s3 py-1 font-sans text-[10px] font-medium text-paper">
              <span className="h-1 w-1 rounded-pill bg-paper" />
              13
            </span>
            <span className="h-6 w-6 rounded-pill border border-[var(--ink-12)] bg-placeholder" />
          </div>
        </div>

        <div className="relative mx-s3">
          <Hatch label="your photo" className="aspect-[2/3] rounded-plate" />
          <span className="absolute top-2 left-2 rounded-pill bg-[rgba(250,248,245,.9)] px-2 py-1 font-sans text-[9.5px] font-medium">
            {style?.name} · {color?.name}
          </span>
        </div>

        <div className="px-s3 pt-s3">
          <div className="flex h-9 items-center justify-center rounded-pill bg-ink font-sans text-[12.5px] font-medium text-paper">
            Try On
            <span className="pl-1.5 font-mono text-[8.5px] opacity-55">1 credit</span>
          </div>
        </div>

        <div className="px-s3 pt-s4 pb-s5">
          <p className="pb-2 font-mono text-[8px] tracking-[0.14em] text-[var(--ink-45)] uppercase">
            Hair colours
          </p>
          <div className="flex gap-2">
            {HAIR_COLORS.slice(0, 7).map((hair) => (
              <span
                key={hair.id}
                className="h-5 w-5 shrink-0 rounded-pill"
                style={{
                  background: hair.hex,
                  boxShadow: "inset 0 -3px 5px rgba(0,0,0,.22)",
                  outline: hair.id === DEFAULT_COLOR_ID ? "1.5px solid var(--color-ink)" : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
