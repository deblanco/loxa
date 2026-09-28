# Review notes

What goes in **App Store Connect → App Review Information**, kept here because
that box is a text field with no history: the version that got approved is
otherwise unrecoverable, and the next submission starts from whatever somebody
remembers.

Everything below is written to be pasted. Prose, not bullets — the panel renders
plain text, and a reviewer reads it in about twenty seconds.

## Why this app needs notes at all

Loxa has no account. A fresh install gets **one free photo** (`FREE_CREDITS` is
1, lifetime, per device id), and every photo after that is the weekly
subscription or a $0.99 single. The offer appears once, after that first
result, and the out-of-credits sheet whenever the balance is zero.

A reviewer can therefore reach the core feature without buying anything, and
must still be told how to reach both purchases — 2.1(b) asks that in-app
purchases be reviewable, and the second one only appears after the free photo
has been spent.

## History

- **2.1, Information Needed** (first submission). Seven questions; answered in
  `f65d2bb`, and the numbered sections below are still those answers.
- **4.3(b), Design — Spam** (September 2026). No defect named: the app's
  "design, content and overall concept" read as one more AI hair try-on. What
  the reviewer met was a paywall on the second screen, no way to see the product
  without paying, a single loop with nothing kept, and a listing that described
  the category rather than the app. The resubmission changes all four, and the
  notes open with that list rather than making the reviewer find it.

## Notes — paste as-is

Rewritten 2 September 2026, after the first submission came back under
**guideline 2.1, "Information Needed — New App Submission"**. That rejection is
the one a developer account with no review history gets: App Review asked seven
questions rather than naming a defect, and asked for the answers *both* in the
Resolution Center reply and in this field, "for reference on future
submissions". So the field is now the answer sheet, in their order, and the
reply quotes it rather than the other way round.

The old notes were not deleted so much as absorbed: what was the whole of them —
no account, no free tier, how to reach a purchase — became section 3 of those
answers, because that is the question App Review actually asks it under.

Rewritten again for the resubmission after 4.3(b), and last for build 17 on 28
September 2026. The seven answers are no longer numbered, but none of them is
gone: the recording and the test path are "How to test", services and purchases
have their own headings, and audience, regions and regulated material sit under
"Everything else". What leads now is why this is not the app the 4.3(b)
reviewer took it for — the face measured on the device, the cuts that suit it,
the render kept beside its original — and that it is native code rather than a
wrapper, since that is what this submission has to answer.

Under 4,000 characters, which is the field's limit and the reason this is
compressed rather than discursive.

> Loxa restyles a photograph of the user's own face with a different haircut and colour, and tells them which cuts suit the shape of that face. No account, no login. The first photo is free; after that a weekly subscription or a single photo.
>
> BUILD 17: hold-to-compare, once hidden under Share, now works; a paid photo always becomes a credit.
>
> WHY THIS IS NOT THE APP IT WAS MISTAKEN FOR
> The category puts a haircut on a stock model, or paints a filter over yours. Neither answers what a person actually asks before a salon: would this suit me. Loxa measures the face in the photograph — on the device, using Apple Vision — and never sends that measurement anywhere. It puts the cuts suiting that shape first, and will name them outright with a sentence each saying why. The render is made from that same face and kept beside the photo it came from, so the two can be compared weeks later.
>
> NOT A WEB WRAPPER
> Native iOS throughout: no WebView, no remote HTML, no downloaded code. The face measurement is our own Swift module built on Apple's Vision framework, running on the device. The catalogue, the credit ledger and the model calls are our own backend on Cloudflare, written for this app.
>
> WHAT CHANGED SINCE THE 4.3(b) REVIEW
> - The first photo is free: a new install sees its own face restyled without paying.
> - A four-card intro explains the app and what the phone does with a face.
> - Before a photo is first sent, a sheet names who receives it and asks the user to agree. Declining sends nothing.
> - The subscription offer no longer sits in front of the app; it appears once, after that first result.
> - Face shape is estimated on the device; the cuts that suit it come first, marked "suits you".
> - "What suits me": one or two photos are read by a model that names the cuts suiting the face, with a reason for each. Needs a credit balance, spends none.
> - A gallery keeps every look beside the photograph it was made from.
>
> HOW TO TEST
> No sign-in, demo account or sample files. Purchases use the sandbox account on the device.
> a. Launch, tap Get started, pass the four intro cards. The photo and notification cards can be skipped.
> b. Take a photo or choose one. Cuts suiting the measured shape move to the front, marked "suits you".
> c. Pick a cut and a colour, tap Try On, then Agree on the sheet. About ten seconds. A device that already spent its free photo goes straight to step e.
> d. Leave the result: the offer appears once. Subscribe, or dismiss it with the X.
> e. Tap Try On again: the out-of-credits sheet offers both products.
> f. Profile > Your looks: every result, openable to compare, share or delete.
> A screen recording of this flow on a physical iPhone is attached.
>
> IN-APP PURCHASE
> - Loxa Weekly (loxa_weekly_999), auto-renewable, one week, USD 9.99, first week USD 0.99. 20 photos a week, reset Monday, no roll-over.
> - One more photo (loxa_single_photo_099), consumable, USD 0.99. One photo, no subscription.
> Both appear at steps d and e; a subscriber out of weekly photos sees only the single photo. Profile links to both and to Manage Subscription. Credits are granted by our server once the store confirms. Restore purchases is on both purchase screens and in Profile.
>
> EXTERNAL SERVICES
> - Google Vertex AI (Gemini image model): the restyled photograph. OpenRouter runs the same model when Vertex is rate-limited.
> - opencode, OpenRouter: the vision model behind "what suits me". We keep no photo and train on none.
> - RevenueCat: purchases. Cloudflare Workers, D1, KV, R2: backend, ledger, catalogue.
>
> EVERYTHING ELSE
> No user-generated content, social features, accounts or advertising. No analytics or advertising SDK, no advertising identifier, no tracking. Error reports carry no identifier and no photo and are deleted after thirty days. Not a regulated industry. No third-party material: catalogue photos are generated; the only other image is the user's own. Prices are the App Store's per storefront; five languages, from the device.
>
> Contact: apps@blankhexadecimal.com

## The rest of the panel

- **Sign-in required:** No. There is no account of any kind, so no demo
  credentials. Say this rather than leaving the field ambiguous.
- **Contact:** the address on the support page — `apps@blankhexadecimal.com`.
- **Attachment:** a screen recording, and no longer optional. Guideline 2.1 for
  a new developer account asks for one captured on a physical device on the
  current OS, starting at launch and showing the typical flow — and, where the
  app sells anything, the purchase controls with the title, length and price of
  each subscription and the links to the terms and the privacy policy visible in
  frame. Ours is `loxa-demo.mp4`, re-encoded down from the original recording
  because the field will not take 226 MB.

## Before submitting, verify

The notes promise things the configuration has to actually deliver. Each of
these has failed in a way that looks, to a reviewer, exactly like a broken app:

- **Both products are attached to the version.** App Store Connect → the version
  → "In-App Purchases and Subscriptions". A first submission whose products are
  not attached comes back as "unable to review your in-app purchases", and the
  products never entered review at all.
- **`loxa_weekly_999` carries the Privacy Policy and Terms of Use URLs** on the
  subscription itself, not only at app level:
  `https://loxa.blankhexadecimal.com/privacy-policy` and `/terms`.
- **A sandbox purchase actually grants a credit**, run once on a TestFlight
  build. The Worker filters on neither environment nor `is_sandbox`
  (`services/api/src/adapters/entitlements/revenuecat.ts`), so this should hold —
  but that proves the logic, not that the `sk_` key, project id and entitlement
  id are right in production secrets.
- **`DEV_PREMIUM` is unset in the production Worker.** Set, it hands the reviewer
  a subscription nobody bought and puts the paywall out of reach of review.
- **The description says the first photo is free, once, and what everything
  after it costs** (2.3.2). Nothing may imply more than one free render.
- **The provider's retention terms are confirmed in writing.** The analysis
  model's "ZDR through Sep 2026" note has expired (`services/api/wrangler.toml`).
  The privacy page and the consent sheet now say only what *we* do and point to
  each provider's own terms, but if the terms are not what you would want to
  put in front of a reviewer, change the model.
- **The archive's Privacy Report is read.** The collected-data declarations in
  `app.json` (`ios.privacyManifests`) were written from Apple's documented type
  names and could not be validated offline.
- **The new catalogue manifest is uploaded**, after the Worker deploy, so
  `GET /v1/catalogue` carries `suits`. Without it the "suits you" feature the
  notes describe is invisible.
- **The screen recording is re-shot** on the new flow: it now starts with the
  four intro cards, and it should show the profile-photo card being **skipped**
  at least once, the notification card too, and the sheet that asks before the
  first photo is sent being **agreed to** — a reviewer who never sees it may
  assume the app uploads without asking. A reviewer who only sees a tester dutifully take a photo learns
  that the step is optional from nowhere, and a first-run photo gate is exactly
  the kind of thing this submission is answering.
