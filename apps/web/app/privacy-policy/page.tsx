import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy — Loxa" };

/**
 * Required by App Store review, and the URL the app links to from the profile.
 *
 * Written as the truth about what the app actually does, which is unusually
 * short because the app collects unusually little: no account, no email, an
 * anonymous device id, and photos that are not kept.
 */
export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-2xl px-s6 py-s14">
      <Link href="/" className="font-mono text-[11px] text-[var(--ink-45)] underline underline-offset-4">
        Loxa
      </Link>

      <h1 className="mt-s5 font-serif text-4xl leading-tight">Privacy policy</h1>
      <p className="mt-s2 font-mono text-[11px] text-[var(--ink-45)]">
        Last updated 27 August 2026
      </p>

      <div className="mt-s8 space-y-s5 text-[15px] leading-relaxed text-[var(--ink-72)]">
        <Section title="There is no account">
          Loxa has no sign-up, no login and no password. The app generates a
          random identifier on your device the first time it runs, and uses it
          only to count how many photos you have left. It is not linked to your
          name, your email address or your Apple ID.
        </Section>

        <Section title="Your photos">
          The photo you choose is sent to our server, passed to Google&rsquo;s
          image model to be restyled, and returned to you. The generated image
          is saved on your device. A copy of the result is held for up to thirty
          days so that repeating the same request does not cost you a second
          credit, and is then deleted automatically. We do not use your photos
          to train anything, and no human at Loxa looks at them.
        </Section>

        <Section title="Purchases">
          Subscriptions and one-off purchases are handled by Apple and by
          RevenueCat, our billing provider. We never see your payment details.
          We ask RevenueCat only whether a purchase happened, so we know how many
          photos you are owed.
        </Section>

        <Section title="Notifications">
          If you turn on daily style ideas, the notifications are scheduled on
          your device. Nothing is sent from our servers and we do not know
          whether you opened one.
        </Section>

        <Section title="Deleting your data">
          Deleting the app removes the identifier and every generated photo on
          the device. The cached result expires on its own within thirty days.
          To ask us to delete anything sooner, write to{" "}
          <a href="mailto:hola@blankhexadecimal.com" className="underline underline-offset-4">
            hola@blankhexadecimal.com
          </a>
          .
        </Section>
      </div>
    </main>
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
