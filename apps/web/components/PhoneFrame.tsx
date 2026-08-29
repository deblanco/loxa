/**
 * The app's try-on screen, in a bezel.
 *
 * A real screenshot, taken on an iPhone 17 Pro Max running the app against the
 * real Worker — not a rebuild from the tokens. The rebuild could not drift out
 * of date, but it also could not answer the only question the hero has to
 * answer, which is *what does this actually look like*. A screenshot can drift,
 * so it is retaken when the screen changes.
 *
 * The picture in the plate is one of the catalogue's own generated models, and
 * the shot is of the app at rest: a photo chosen, a style picked, nothing spent.
 */
export function PhoneFrame() {
  return (
    <div className="w-full max-w-[272px] rounded-[46px] border border-[var(--ink-12)] bg-paper p-s3 shadow-[0_24px_60px_rgba(13,12,11,.14)]">
      <img
        src="/app-home.jpg"
        alt="The Loxa try-on screen: a photo in the plate, a strip of cuts below it, and a Try On button costing one credit."
        width={414}
        height={900}
        className="w-full rounded-[34px] bg-placeholder"
      />
    </div>
  );
}
