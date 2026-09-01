import { SINGLE_PHOTO_PRICE_LABEL, WEEKLY_CREDITS } from "@loxa/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CONTACT_EMAIL } from "../legal-details";

export const metadata: Metadata = { title: "Support — Loxa" };

/**
 * The Support URL App Store Connect asks for.
 *
 * It has to be a page rather than the `mailto:` in the footer: the field wants
 * a URL, and a reviewer follows it. The four questions below are the ones the
 * app cannot answer for itself, because the answers live in iOS Settings.
 */
export default function Support() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-s6 pt-s6 pb-s10">
      <div className="max-w-2xl">
      <h1 className="mt-s5 font-serif text-4xl leading-tight">Support</h1>
      <p className="mt-s2 font-mono text-[11px] text-[var(--ink-45)]">
        Write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
      </p>

      <div className="mt-s8 space-y-s5 text-[15px] leading-relaxed text-[var(--ink-72)]">
        <Section title="Cancelling your subscription">
          Loxa cannot cancel it, because Apple holds the subscription. On your
          iPhone, open Settings, tap your name at the top, then Subscriptions,
          then Loxa, then Cancel Subscription. The app has a Manage button on
          the profile screen that takes you to the same place. Cancel at least
          24 hours before the week ends to stop the next renewal — the week you
          have already paid for runs to its end either way.
        </Section>

        <Section title="You paid but have no credits">
          Open the profile screen and tap Restore purchases; it is also on both
          purchase screens. That asks the App Store what you own and tells our
          server. It needs the same Apple ID you bought with. If the count is
          still wrong afterwards, write to us — say roughly when you bought and
          what you bought, and we will sort it out.
        </Section>

        <Section title="Refunds">
          Apple takes the payment, so Apple issues the refunds. Ask at{" "}
          <a
            href="https://reportaproblem.apple.com"
            className="underline underline-offset-4"
          >
            reportaproblem.apple.com
          </a>
          . If something in the app went wrong we would like to hear about it
          regardless.
        </Section>

        <Section title="How credits work">
          One credit is one generated photo. The weekly subscription includes{" "}
          {WEEKLY_CREDITS} a week; they reset every Monday and do not carry
          over. If you run out before Monday you can buy a single photo for{" "}
          {SINGLE_PHOTO_PRICE_LABEL} without subscribing.
        </Section>

        <Section title="A photo was refused">
          Loxa checks on the phone that there is a face in the picture before
          sending anything, and the model itself can decline a photo. A clear,
          front-facing shot in even light with hair down works best. A refused
          photo does not cost a credit.
        </Section>

        <Section title="Deleting what we hold">
          See{" "}
          <Link href="/privacy-policy" className="underline underline-offset-4">
            the privacy policy
          </Link>
          , which explains what there is and how to have it removed. It is less
          than you might expect: there is no account, and the photo you send is
          never stored.
        </Section>
      </div>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      <p className="mt-s2">{children}</p>
    </section>
  );
}
