import {
  HAIR_COLORS,
  HAIR_STYLES,
  INTRO_PRICE_LABEL,
  SINGLE_PHOTO_PRICE_LABEL,
  WEEKLY_CREDITS,
  WEEKLY_PRICE_LABEL,
} from "@loxa/shared";
import { Hatch } from "@/components/Hatch";
import { PhoneFrame } from "@/components/PhoneFrame";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * The landing page.
 *
 * Same system as the app — warm paper, one black, serif statements — so someone
 * arriving from the App Store listing recognises where they are.
 *
 * Everything factual is read from `@loxa/shared`: the styles, the colours, the
 * price and what it buys. The site therefore cannot advertise a style the app
 * does not ship or a price it does not charge, which is the sort of drift that
 * only ever gets noticed by a reviewer.
 *
 * Every picture is real: a screenshot of the app, the render it produced one
 * credit apart, and two captures of the face-reading screens. The styles are
 * counted rather than shown, because a grid of them is the app's job and a page
 * of placeholders was worse than no grid at all.
 *
 * The page follows the App Store listing's order on purpose (see
 * `apps/mobile/STORE_LISTING.md`): what it does, then what no other app in the
 * category does — read the face and say which cuts suit it — then the rest.
 */
const STEPS = [
  { n: "01", title: "Take a photo", body: "Front camera, even light, hair down. Or pick one you already have." },
  { n: "02", title: "Pick a look", body: `${HAIR_STYLES.length} cuts and ${HAIR_COLORS.length} colours — the ones that suit your face shape come first.` },
  { n: "03", title: "See yourself", body: "Your own face, new hair, usually in a few seconds. Your first photo is free." },
] as const;

/**
 * The smaller things the app does, each one checkable in the app. The gallery
 * lives on the phone (`apps/mobile/src/store/look-record.ts`), which is why this
 * says "on your phone" and not "in your account": there is no account.
 */
const DETAILS = [
  {
    title: "Hold to compare",
    body: "Press and hold a result to see the photo you started from underneath it. The difference, on you.",
  },
  {
    title: "Every look, kept",
    body: "Every look you make is kept in a gallery on your phone, with the photo it came from — to compare again, or to show your hairdresser.",
  },
  {
    title: "No account",
    body: "No sign-up, no email, no social feed. In English, Spanish, French, German and Italian.",
  },
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-5xl items-center gap-s10 px-s6 pt-s4 pb-s14 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="font-serif text-[clamp(2.75rem,6vw,4rem)] leading-[1.02] tracking-[-0.015em]">
              Try on any hair
              <br />
              <span className="italic opacity-80">before the scissors.</span>
            </h1>

            <p className="mt-s5 max-w-[46ch] text-[15.5px] leading-relaxed text-[var(--ink-60)]">
              Photo in, new hair out. Colours, cuts and lengths on your own face in
              seconds — not a stock model with the haircut you were thinking about.
              Your first photo is free.
            </p>

            <div className="mt-s8 flex flex-wrap items-center gap-s4">
              {/* A badge, not a button. There is nowhere to send anyone yet, and a
                  black pill that does nothing when pressed is a small lie. */}
              <span className="inline-flex h-12 items-center rounded-pill border border-[var(--ink-18)] px-s5 font-mono text-[11px] tracking-[0.1em] uppercase">
                Coming to the App Store
              </span>
              <span className="font-mono text-[11px] text-[var(--ink-45)]">
                First week {INTRO_PRICE_LABEL}, then {WEEKLY_PRICE_LABEL}
              </span>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <PhoneFrame />
          </div>
        </section>

        {/* The transformation, which is the entire pitch */}
        <section className="mx-auto max-w-5xl px-s6 pb-s14">
          <div className="grid gap-s4 sm:grid-cols-2">
            <figure>
              <Hatch
                photo="/before.jpg"
                className="aspect-[2/3] rounded-card"
              />
              <figcaption className="pt-s3 font-mono text-[10px] tracking-[0.14em] text-[var(--ink-45)] uppercase">
                Before
              </figcaption>
            </figure>
            <figure>
              <Hatch
                photo="/after-curtain-bang-honey-blonde.jpg"
                className="aspect-[2/3] rounded-card"
                dark
              />
              <figcaption className="pt-s3 font-mono text-[10px] tracking-[0.14em] text-[var(--ink-45)] uppercase">
                After · one credit
              </figcaption>
            </figure>
          </div>
        </section>

        {/*
          The face reading — the thing no other app in the category does, so it
          sits straight after the before/after rather than below the prices.

          Two claims, kept apart because they are different facts. The shape
          estimate is made on the phone and never sent. Asking which cuts suit
          you *does* send a photo, to a vision model, after its own consent
          sheet — and the privacy policy says so in the same words: read, not
          kept, not trained on. "Vision model", never "LLM": what runs reads an
          image. And never "facial recognition": nothing here identifies anyone.
          "Included with any credit balance", never "free" — the route requires
          a balance (`services/api/src/adapters/http/routes.ts`).
        */}
        <section className="mx-auto max-w-5xl px-s6 pb-s14">
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] tracking-[-0.01em]">
            It reads your face,
            <br />
            <span className="italic opacity-80">then says what suits it.</span>
          </h2>

          <div className="mt-s8 grid items-start gap-s10 md:grid-cols-[1fr_1fr]">
            <div className="space-y-s5 text-[15px] leading-relaxed text-[var(--ink-60)]">
              <p>
                Ask, and one of the newest AI vision models looks at your
                photograph — two if you want, from another angle — names the
                shape of your face, and picks the cuts from the catalogue that
                suit it, with a sentence each saying why. It is included with any
                credit balance and costs none. The photos are read and let go:
                never kept, never used to train anything.
              </p>
              <p>
                Loxa also estimates your face shape on the phone itself — oval,
                round, square, heart or long — and puts the cuts that often suit
                it at the front of the strip. That estimate never leaves the
                phone, and nothing in it identifies you.
              </p>
              <p className="text-[var(--ink-45)]">A suggestion, not a rule. Every cut is still there.</p>
            </div>

            <div className="grid grid-cols-2 gap-s4">
              <figure>
                <img
                  src="/app-face.jpg"
                  alt="Onboarding screen: “We read the face, never the person.” A diagram of eight points measured on the phone, and the mark that sits on cuts that suit you."
                  width={600}
                  height={1167}
                  loading="lazy"
                  className="w-full rounded-card border border-[var(--ink-09)] bg-placeholder"
                />
                <figcaption className="pt-s3 font-mono text-[10px] tracking-[0.14em] text-[var(--ink-45)] uppercase">
                  Measured on the phone
                </figcaption>
              </figure>
              <figure>
                <img
                  src="/app-suits.jpg"
                  alt="The What suits me screen: “Heart-shaped face”, then six cuts, each with a sentence on why it suits and a Try on button."
                  width={600}
                  height={1167}
                  loading="lazy"
                  className="w-full rounded-card border border-[var(--ink-09)] bg-placeholder"
                />
                <figcaption className="pt-s3 font-mono text-[10px] tracking-[0.14em] text-[var(--ink-45)] uppercase">
                  Read by a vision model
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-s6 pb-s14">
          <div className="grid gap-s6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n}>
                <p className="font-mono text-[10px] tracking-[0.14em] text-[var(--ink-45)]">{step.n}</p>
                <h3 className="mt-s2 font-serif text-2xl">{step.title}</h3>
                <p className="mt-s2 text-[14.5px] leading-relaxed text-[var(--ink-60)]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The rest of what the app does */}
        <section className="mx-auto max-w-5xl px-s6 pb-s14">
          <div className="grid gap-s6 border-t border-[var(--ink-09)] pt-s8 sm:grid-cols-3">
            {DETAILS.map((detail) => (
              <div key={detail.title}>
                <h3 className="font-serif text-2xl">{detail.title}</h3>
                <p className="mt-s2 text-[14.5px] leading-relaxed text-[var(--ink-60)]">{detail.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The catalogue, read from the same source the app renders from */}
        <section className="mx-auto max-w-5xl px-s6 pb-s14">
          <div className="rounded-card border border-[var(--ink-09)] bg-surface-raised p-s6">
            <h2 className="font-mono text-[10px] tracking-[0.14em] text-[var(--ink-45)] uppercase">
              Hair colours
            </h2>
            <ul className="mt-s4 flex flex-wrap gap-s4">
              {HAIR_COLORS.map((color) => (
                <li key={color.id} className="flex items-center gap-s2 text-[13.5px]">
                  <span
                    aria-hidden
                    className="inline-block h-5 w-5 rounded-pill"
                    style={{ background: color.hex, boxShadow: "inset 0 -4px 6px rgba(0,0,0,.22)" }}
                  />
                  {color.name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing — stated plainly, because the app charges within two taps */}
        <section className="mx-auto max-w-5xl px-s6 pb-s10">
          {/* Once, and the sentence says once: `FREE_CREDITS` is a single credit per device (2.3.2). */}
          <p className="mb-s5 font-serif text-2xl">
            Your first photo is free, once.{" "}
            <span className="text-[var(--ink-45)]">After that, and with no advertising:</span>
          </p>
          <div className="grid gap-s4 sm:grid-cols-2">
            <div className="rounded-card bg-ink p-s6 text-paper">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[rgba(250,248,245,.5)] uppercase">
                Loxa Weekly
              </p>
              <p className="mt-s2 font-serif text-4xl">{WEEKLY_PRICE_LABEL.split("/")[0]}
                <span className="text-xl opacity-50">/week</span>
              </p>
              <p className="mt-s3 text-[14.5px] leading-relaxed text-[rgba(250,248,245,.66)]">
                {WEEKLY_CREDITS} photos every week, any style or colour. Credits reset
                every Monday and do not carry over. First week {INTRO_PRICE_LABEL}, then{" "}
                {WEEKLY_PRICE_LABEL}. Cancel anytime.
              </p>
            </div>

            <div className="rounded-card border border-[var(--ink-12)] p-s6">
              <p className="font-mono text-[10px] tracking-[0.14em] text-[var(--ink-45)] uppercase">
                One photo
              </p>
              <p className="mt-s2 font-serif text-4xl">{SINGLE_PHOTO_PRICE_LABEL}</p>
              <p className="mt-s3 text-[14.5px] leading-relaxed text-[var(--ink-60)]">
                A single generation, no subscription. For when you have run out and
                there is one more look you want to see.
              </p>
            </div>
          </div>
        </section>

        {/*
          The one promise worth making twice — and it has to be the promise the
          privacy policy actually makes. This used to say "we do not keep it"
          flatly, which is true of the photo you send and not of the picture
          that comes back: that one is cached for thirty days so a repeat does
          not cost a second credit. A marketing line that overshoots the policy
          it links to is the wrong one to be caught on.
        */}
        <section className="mx-auto max-w-5xl px-s6 pb-s8">
          <p className="max-w-[52ch] font-serif text-2xl leading-snug">
            It is your face, not a model with your haircut.{" "}
            <span className="text-[var(--ink-45)]">
              Every render is made from your own photo, nothing leaves the phone
              until you have agreed to where it goes, and the photo you send is
              never stored.
            </span>
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
