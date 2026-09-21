import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CONTACT_EMAIL,
  JURISDICTION,
  LAST_UPDATED,
  OPERATOR,
  OPERATOR_ADDRESS,
} from "../legal-details";

export const metadata: Metadata = { title: "Privacy policy — Loxa" };

/**
 * Required by App Store review, and the URL the app links to from the profile
 * and from both paywalls.
 *
 * Written as the truth about what the app actually does, which is unusually
 * short because the app collects unusually little: no account, no email, an
 * anonymous device id, and photos that are not kept.
 *
 * Every factual claim below is checkable against the code, and was checked:
 * the input photo is never written to a store (`core/try-on.ts`), the render is
 * cached for thirty days (`adapters/kv/render-cache.ts`), a suitability answer
 * for seven (`adapters/kv/analysis-cache.ts`) under a key derived from the
 * photographs alone (`core/cache-key.ts`), the analysis route never writes the
 * style tally (`core/analyse-face.ts`), the device id is the
 * only identifier the Worker sees (`adapters/http/device.ts`), and the style
 * tally carries no device id (`schema.sql`). Nor does an error report: the
 * `diagnostic_report` table has no column for one, the id is spent on a rate
 * limit in KV and never written beside a report, and the base64 of a photo is
 * scrubbed before a report leaves the phone
 * (`apps/mobile/src/diagnostics/report.ts`). Keep it that way — a claim here
 * that the code stops honouring is worse than no claim at all.
 */
export default function PrivacyPolicy() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-s6 pt-s6 pb-s10">
      <div className="max-w-2xl">
      <h1 className="mt-s5 font-serif text-4xl leading-tight">Privacy policy</h1>
      <p className="mt-s2 font-mono text-[11px] text-[var(--ink-45)]">
        Last updated {LAST_UPDATED}
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
          in it. The same check estimates the rough shape of the face — oval,
          round and so on — so the cuts that often suit it can be shown first.
          Both happen on your phone, and neither answer is sent anywhere; you
          can clear the face shape from your profile. Your photo is then made
          smaller, sent to our server, passed
          to an image model to be restyled, and returned to you.
          <br />
          <br />
          Asking us which cuts suit you is a separate thing you choose to do.
          One or two photos are sent to our server and shown to a model that
          answers with a face shape and a short list of cuts, each with a
          sentence saying why. That answer replaces the estimate your phone
          made, and you can clear it from your profile like any other. The
          photographs are not kept; the answer is, for up to seven days, so
          that asking the same thing twice does not mean a second call.
        </Section>

        <Section title="Which model, and whose">
          The model is Google&rsquo;s. We reach it in one of two ways: normally
          through Google Cloud directly, and — when Google will not answer,
          which happens because our rate limit there is low — through OpenRouter,
          which routes the same request to the same model on its own account.
          Your photo therefore passes through Google, and sometimes through
          OpenRouter as well. Neither is given anything about you beyond the
          photo and the style asked for: no identifier, no name, nothing that
          says which request belongs to whom.
          <br />
          <br />
          The suggestion feature uses a different model, and not always the same
          company&rsquo;s. Normally it is a vision model we reach through
          opencode, on terms that keep nothing and train on nothing; when that
          cannot be reached we ask a model on OpenRouter instead. Either way it
          is shown your photograph and the names of the cuts in our catalogue,
          and nothing else — no identifier, and nothing that says whose request
          it is. Neither provider is given your photo to train on.
        </Section>

        <Section title="What happens to them afterwards">
          The photo you sent is not stored on our server. The generated image is
          saved on your device, together with the photo it was made from so
          that you can compare the two later, and a copy of it is held by us for up to thirty
          days so that repeating the same request does not cost you a second
          credit — after that it is deleted automatically. A profile picture is kept
          on your phone and is sent only when you press Try On with it, like any
          other photo you choose; it is not stored on our server either. We do
          not use your photos to train anything, and no human at Loxa looks at
          them.
        </Section>

        <Section title="What we count">
          We keep a tally of how often each cut and colour is chosen, so we know
          which ones to make next. It is a running total per style, with no
          identifier attached — the tally cannot say who picked what, only that
          a cut was picked. We use no analytics or advertising SDKs, we do not
          use the advertising identifier, and we do not track you across other
          apps or websites.
        </Section>

        <Section title="When something goes wrong">
          When the app hits an error &mdash; a screen that fails to draw, a
          photo that will not open, a restyle that does not come back &mdash; it
          sends us a short report so we can fix it: what the error was, where in
          our code it happened, which version of the app and of iOS you are on,
          and the last few screens you visited. It carries <strong>no
          identifier</strong> and <strong>never your photo</strong>; anything
          resembling image data is stripped out on your phone before the report
          is sent. Reports are deleted after thirty days. We do use your random
          identifier at the moment a report is sent, to stop a single misbehaving
          phone flooding us, but it is not saved next to the report and we cannot
          tell whose report it was.
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

        <Section title="Where this happens, and how it is kept">
          Our server runs on Cloudflare&rsquo;s network, which is worldwide, so
          a request is handled near you and the cached result is held on that
          network. The image model runs on Google&rsquo;s infrastructure. That
          means your photo may be processed outside the country you are in,
          including in the United States. Everything travels over an encrypted
          connection, the cached result is reachable only by a key derived from
          the photo itself — so nobody can ask for yours without already having
          it — and access to the systems that hold any of it is limited to the
          people who run Loxa.
        </Section>

        <Section title="Your rights">
          Because there is no account, most of what we hold is a number of
          credits attached to a random identifier. You can still ask us what
          that is, ask us to correct it, or ask us to delete it, and if you are
          in the UK or the EU you can complain to your data protection
          authority. We handle your photo to provide the app you asked for, and
          we keep the credit count to run the subscription you bought — those
          are the two reasons we process anything, and we do not process
          anything for advertising.
        </Section>

        <Section title="Children">
          Loxa is not for people under 16. We do not knowingly hold a photo or a
          purchase from anyone younger, and if we learn that we have, we will
          delete it.
        </Section>

        <Section title="Deleting your data">
          Deleting a look in the app removes it and the photo it was made from.
          Deleting the app removes every generated photo, every original and
          your profile picture from the device, but keeps the identifier so a reinstall does
          not cost you what you paid for. Erasing the device removes that too.
          Cached results expire on their own within thirty days, and a
          suitability answer within seven. To have us
          delete the identifier and everything attached to it, write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
          . Deleting it ends any credits attached to it, including bought ones,
          because there is nothing else that could identify them as yours. Error
          reports cannot be deleted on request, because nothing in them says
          they are yours &mdash; that is the same reason they are safe to keep
          at all, and they expire within thirty days regardless.
        </Section>

        <Section title="Changes to this policy">
          If what the app does changes, this page changes with it, and the date
          at the top says when. We will not quietly start collecting something
          this page says we do not.
        </Section>

        <Section title="Who to write to">
          Loxa is operated by {OPERATOR}, {OPERATOR_ADDRESS}, which is the data
          controller for the purposes of data protection law in {JURISDICTION}.
          Write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
            {CONTACT_EMAIL}
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
