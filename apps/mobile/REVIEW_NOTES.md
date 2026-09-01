# Review notes

What goes in **App Store Connect → App Review Information**, kept here because
that box is a text field with no history: the version that got approved is
otherwise unrecoverable, and the next submission starts from whatever somebody
remembers.

Everything below is written to be pasted. Prose, not bullets — the panel renders
plain text, and a reviewer reads it in about twenty seconds.

## Why this app needs notes at all

Loxa has no account and **no free tier**. `FREE_CREDITS` is 0, so a fresh
install can browse the catalogue and nothing else: every render spends a credit,
and the only ways to hold one are the weekly subscription or a $0.99 photo.

That makes the core feature unreachable without a purchase, which is fine —
2.1(b) asks that in-app purchases be reviewable, not that anything be free — but
only if the notes say so. A reviewer who dismisses the offer, taps Try On, gets
a paywall and stops there has seen an app that does nothing, and will write it
up as 2.1.

## Notes — paste as-is

> Loxa has no account, no login and no free tier. Every generated photo costs
> one credit and a new install has none, so the app's core feature requires an
> in-app purchase.
>
> The onboarding offer can be dismissed with the ✕ in the top corner. That leads
> into the app and the full catalogue of cuts and colours can be browsed, but
> Try On will return "out of credits" until something is bought.
>
> To exercise the core feature:
>
> 1. Sign in to a Sandbox Apple ID under Settings → Developer → Sandbox Apple
>    Account.
> 2. Launch Loxa and continue past the entry carousel.
> 3. Either subscribe on the offer screen, or dismiss it and tap Try On to reach
>    the same two products on the out-of-credits sheet.
> 4. Buy either loxa_weekly_999 ($9.99/week, first week $0.99) or
>    loxa_single_photo_099 ($0.99, one photo).
> 5. Take a photo or choose one from the library, pick a cut and a colour, and
>    tap Try On. The generated image appears in roughly ten seconds.
>
> Credits are granted server-side after our backend confirms the transaction
> with the store, so the balance updates a moment after the App Store sheet
> closes. Restore purchases is available on the offer screen, on the
> out-of-credits sheet and in Profile.
>
> The subscription renews weekly and is cancelled in Apple's subscription
> settings, reachable from Profile → Manage. Both the renewal terms and links to
> the terms of use and privacy policy appear next to every purchase control.
>
> The app requires the camera or the photo library to supply the photograph it
> restyles. It has no user-generated content, no social features, no accounts
> and no analytics or advertising SDKs. It reports its own errors to our server
> for diagnosis — no third-party SDK, no identifier attached, no photo, deleted
> after thirty days. This is the "Diagnostics → Crash Data, not linked to
> identity" entry on the privacy nutrition label.

## The rest of the panel

- **Sign-in required:** No. There is no account of any kind, so no demo
  credentials. Say this rather than leaving the field ambiguous.
- **Contact:** the address on the support page — `hola@blankhexadecimal.com`.
- **Attachment:** none needed. If a build is ever rejected for a purchase that
  would not complete, attach a screen recording of the sandbox buy rather than
  arguing it in text.

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
- **The description and screenshots say the app is paid** (2.3.2). Nothing may
  imply a free render.
