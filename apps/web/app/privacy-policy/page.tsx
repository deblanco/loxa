import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

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
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-s6 pt-s6 pb-s10">
      <div className="max-w-2xl">
      <h1 className="mt-s5 font-serif text-4xl leading-tight">Privacy policy</h1>
      <p className="mt-s2 font-mono text-[11px] text-[var(--ink-45)]">
        Last updated 31 August 2026
      </p>

      <div className="mt-s8 space-y-s5 text-[15px] leading-relaxed text-[var(--ink-72)]">
        <Section title="There is no account">
          Loxa has no sign-up, no login and no password. The app generates a
          random identifier on your device the first time it runs, and uses it
          for two things: counting how many photos you have left, and telling
          our billing provider which subscription is yours. It is not linked to
          your name, your email address or your Apple ID.
        </Section>

        <Section title="That identifier survives reinstalling">
          It is kept in the iOS keychain rather than in ordinary app storage,
          which means deleting Loxa and installing it again gives you back the
          same identifier — and with it the credits you paid for. That is
          deliberate: there is no account to recover from, so anything that
          forgot the identifier would lose a purchase permanently. It is removed
          when you erase or reset the device, or if you ask us (below).
        </Section>

        <Section title="Your photos">
          Before anything is sent, your photo is checked on the device itself,
          using Apple&rsquo;s own face detection, to see whether there is a face
          in it. That check happens on your phone and its answer is not sent
          anywhere. Your photo is then made smaller, sent to our server, passed
          to Google&rsquo;s image model to be restyled, and returned to you.
        </Section>

        <Section title="What happens to them afterwards">
          The photo you sent is not stored on our server. The generated image is
          saved on your device, and a copy of it is held by us for up to thirty
          days so that repeating the same request does not cost you a second
          credit — after that it is deleted automatically. If you set a profile
          picture, it stays on your device and is never uploaded. We do not use
          your photos to train anything, and no human at Loxa looks at them.
        </Section>

        <Section title="What we count">
          We keep a tally of how often each cut and colour is chosen, so we know
          which ones to make next. It is a running total per style, with no
          identifier attached — the tally cannot say who picked what, only that
          a cut was picked. We use no analytics or advertising SDKs, we do not
          use the advertising identifier, and we do not track you across other
          apps or websites.
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
          Deleting the app removes every generated photo and your profile
          picture from the device, but keeps the identifier so a reinstall does
          not cost you what you paid for. Erasing the device removes that too.
          Cached results expire on their own within thirty days. To have us
          delete the identifier and everything attached to it, write to{" "}
          <a href="mailto:hola@blankhexadecimal.com" className="underline underline-offset-4">
            hola@blankhexadecimal.com
          </a>
          .
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
