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

The old notes are not deleted so much as absorbed: what was the whole of them —
no account, no free tier, how to reach a purchase — is now section 3, because
that is the question App Review actually asks it under.

Rewritten again for the resubmission after 4.3(b): a "what changed" paragraph
first, and sections 1, 3 and 7 updated for the new flow.

Under 4,000 characters, which is the field's limit and the reason this is
compressed rather than discursive.

> Loxa restyles a photograph of your own face with a different haircut and colour, and suggests the cuts that suit your face. No account, no login. The first photo is free; after that a weekly subscription or a single photo.
>
> WHAT CHANGED SINCE THE 4.3(b) REVIEW
> - The first photo is free: a new install sees its own face restyled without paying.
> - An intro explains the app, offers a profile photo (skippable), and says what the phone does with a face.
> - The subscription offer no longer sits in front of the app; it appears once, after that result.
> - Face shape: Apple Vision estimates it on the device and the cuts that suit it come first, marked "suits you". It never leaves the phone.
> - "What suits me": one or two photos go to a model that names the cuts suiting the face, with a reason each. Needs a credit balance, spends none.
> - A gallery of every look (Profile > Your looks), kept with its original to compare, share or delete.
> - A listing describing these rather than the category.
>
> 1. SCREEN RECORDING
> Attached, on a physical iPhone on iOS 26, from launch: the intro, the catalogue, a photo, the free render, the one-time offer, the gallery, and the out-of-credits sheet. Purchase controls show title, length, price, auto-renewal terms and links to the Terms and Privacy Policy.
>
> 2. PURPOSE AND AUDIENCE
> For anyone deciding whether to change their hair. A cut is irreversible, and a photo of a stranger does not answer "would this suit me". Loxa answers it on the user's own face. General consumers aged 16 and over.
>
> 3. SETUP AND ACCESS
> No sign-in, demo account, sample files or sandbox setup; purchases use the sandbox account on the device.
> a. Launch Loxa, tap Get started, pass the three intro cards. The middle offers a profile photo and can be skipped.
> b. Take a photo or choose one from the library. Cuts that suit the measured shape move to the front, marked "suits you".
> c. Pick a cut and a colour, tap Try On. The free photo takes about ten seconds.
> d. Leave the result: the offer appears once. Subscribe, or dismiss it with the X.
> e. Tap Try On again: the free photo spent, the out-of-credits sheet offers both products.
> f. Profile > Your looks shows every result; open one to compare, share or delete.
> Credits are granted by our server once the store confirms, a moment after the sheet closes. Restore purchases is on both purchase screens and in Profile.
>
> 4. EXTERNAL SERVICES
> - Google Cloud Vertex AI (Gemini image model): the restyled photograph.
> - OpenRouter: the same Google model when Vertex is rate-limited; also the fallback for "what suits me".
> - opencode: the vision model behind "what suits me". Keeps nothing, trains on nothing.
> - RevenueCat: purchase and subscription checks.
> - Cloudflare Workers, D1, KV, R2: backend, credit ledger, image catalogue.
> No analytics or advertising SDK, no advertising identifier, no tracking.
>
> 5. REGIONAL DIFFERENCES
> None. Prices are the App Store's per storefront. English, Spanish, French, German, Italian, from the device language.
>
> 6. REGULATED INDUSTRY OR THIRD-PARTY MATERIAL
> Neither. The catalogue photographs are generated and owned by us; the only other image is the user's own.
>
> 7. IN-APP PURCHASE
> Two products, both reachable without an account:
> - Loxa Weekly (loxa_weekly_999), auto-renewable, one week, USD 9.99, first week USD 0.99. 20 photos a week, reset Monday, no roll-over.
> - One more photo (loxa_single_photo_099), consumable, USD 0.99. One generated photo, no subscription.
> To reach them: the subscription is on the offer shown once after the free result. After that, Try On with no credits opens the out-of-credits sheet with both; a subscriber who has spent the week sees only the single photo. Profile links to both, and to Manage Subscription.
>
> No user-generated content, social features, accounts or advertising. Errors go to our own server with no identifier and no photo, deleted after thirty days: the "Crash Data, not linked to identity" entry on the privacy label.
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
- **The new catalogue manifest is uploaded**, after the Worker deploy, so
  `GET /v1/catalogue` carries `suits`. Without it the "suits you" feature the
  notes describe is invisible.
- **The screen recording is re-shot** on the new flow: it now starts with the
  three intro cards, and it should show the profile-photo card being **skipped**
  at least once. A reviewer who only sees a tester dutifully take a photo learns
  that the step is optional from nowhere, and a first-run photo gate is exactly
  the kind of thing this submission is answering.
