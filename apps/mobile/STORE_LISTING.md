# Store listing

What goes in **App Store Connect → App Store → 1.0**, kept here for the same
reason as `REVIEW_NOTES.md`: those boxes have no history, and the next
submission otherwise starts from whatever somebody remembers.

Keywords never repeat a word already in the app name or the subtitle — Apple
indexes those fields too, so "try on" under a name of "Loxa: Hair Try-On", or
"taglio" under an Italian subtitle ending in it, buys nothing and spends
characters that could hold a term the listing does not otherwise rank for.

Every factual claim is checkable against the code — 24 cuts and 10 colours are
what `GET /v1/catalogue` actually serves, the prices are
`packages/shared/src/credits.ts`, and the privacy paragraphs are the privacy
policy in shorter words. **The first photo is free, once per device, and
nothing here may imply more than that** (2.3.2): `FREE_CREDITS` is 1, and
everything after it is paid.

Rewritten after the 4.3(b) rejection of September 2026. The listing used to
describe the category — "AI hairstyle try-on", "changer", "simulator" — and it
now describes what is particular to this app: your own face, the cuts that
suit its shape, and a gallery of every look you have tried.

Full description in English only. The other four locales carry a short one —
enough to be legible in the reader's own language, not a second thing to keep
in step with the code.

## Shared across locales

- **Support URL:** `https://loxa.blankhexadecimal.com/support`
- **Marketing URL:** `https://loxa.blankhexadecimal.com`
- **Copyright:** `2026 BLANK HEXADECIMAL, S.L.`
- **Primary category:** Photo & Video · **Secondary:** Lifestyle
- **Name (all locales):** `Loxa: Hair Try-On`

## English (U.S.)

**Subtitle** (30/30)

```
Your face, before the scissors
```

**Keywords** (93/100)

```
haircut,hairstyle,color,face shape,salon,bangs,blonde,balayage,bob,pixie,layers,selfie,ombre,curly
```

**Promotional text** (135/170)

```
Your first photo is free. 24 cuts and 10 colours on your own face, with the ones that suit your face shape first — before the scissors.
```

**Description**

```
Loxa puts a different haircut and a different colour on your own face. Your photo goes in; the same face comes back, restyled — so you can see a change before anyone picks up the scissors. And before you choose, one of the newest AI vision models reads your face and tells you which cuts suit its shape, and why.

HOW IT WORKS
1. Take a photo, or choose one from your library.
2. Pick a cut and a colour — the ones that suit your face shape come first.
3. See yourself wearing it, usually in a few seconds. Your first photo is free.

AI THAT READS YOUR FACE
Ask, and one of the newest AI vision models looks at your photograph — two if you want, from another angle — names the shape of your face, and picks the cuts from the catalogue that suit it, with a sentence each saying why. Included with any credit balance: it costs you none. The photos are read and let go, never kept, and never used to train anything.

Loxa also estimates your face shape — oval, round, square, heart or long — on the phone itself, from your own photo, and puts the cuts that often suit it at the front of the strip. That estimate is never sent anywhere, and you can clear it from your profile.

It is a suggestion, not a rule. Every cut is still there.

24 CUTS
Blunt bob, long layers, curtain bang, pixie, wolf cut, beach waves, sleek straight, braids, curly shag, buzz, long bob, French bob, bixie, blunt fringe, waist length, blowout, seventies flick, mullet, afro, locs, bantu knots, high ponytail, chignon, half-up knot.

10 COLOURS
Jet black, espresso, chestnut, caramel, honey blonde, platinum, ash grey, copper, cherry, lilac.

Any cut with any colour — 240 looks.

IT IS YOUR FACE
Every image is generated from your own photograph. Loxa does not hand back a model wearing the haircut you were thinking about. It hands back you, with your features, your skin and your light kept.

HOLD TO COMPARE
Press and hold a result to see the photo you started from underneath it. That is the whole point: the difference, on you.

EVERY LOOK, KEPT
Every look you make is kept in a gallery on your phone, with the photo it was made from. Open one weeks later, compare it again, share it, or show it to your hairdresser.

WHAT IT COSTS
Your first photo is free, once. After that, and with no advertising:
• Loxa Weekly — 20 photos every week, $9.99 per week. First week $0.99.
• One photo — $0.99, no subscription.
Weekly credits reset every Monday and do not roll over; a single photo you buy never expires.

Payment is charged to your Apple ID account at confirmation of purchase. A subscription renews automatically unless it is cancelled at least 24 hours before the end of the current week. Manage or cancel it in your Apple ID account settings, reachable from Profile → Manage inside the app.

NO ACCOUNT
No sign-up, no login, no email address, no social feed. The app makes an anonymous identifier on your device and uses it for two things: counting the photos you have left, and telling our billing provider which subscription is yours.

YOUR PHOTOS
Before the first photo is sent, Loxa tells you where it goes and asks you to agree — once for a restyle, once for the suggestions, because they are different companies. Decline and nothing is sent. The photo you send is not stored on our servers. Generated images, and the photos they were made from, are saved on your phone; a copy of each generated image is held for up to thirty days, and an answer about which cuts suit you for seven, so that repeating the same request does not cost a second credit. We use no analytics or advertising SDKs, we do not use the advertising identifier, and we do not use your photos to train anything.

IN FIVE LANGUAGES
English, Spanish, French, German and Italian.

Terms of use: https://loxa.blankhexadecimal.com/terms
Privacy policy: https://loxa.blankhexadecimal.com/privacy-policy
Apple's standard licence agreement (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

## Spanish (Spain)

**Subtitle**

```
Tu cara, antes de las tijeras
```

**Keywords**

```
peinado,cabello,pelo,corte,color,forma de cara,probar,peluqueria,rubio,flequillo,melena,selfie
```

**Promotional text**

```
Tu primera foto es gratis. 24 cortes y 10 colores sobre tu propia cara, con los que favorecen a tu tipo de cara primero.
```

**Description**

```
Loxa pone un corte distinto y un color distinto sobre tu propia cara. Entra tu foto y vuelve la misma cara, con otro pelo — para ver el cambio antes de que nadie coja las tijeras.

Haz una foto o elige una de tu galería, escoge un corte y un color, y en unos segundos te ves con él. Mantén pulsado el resultado para ver debajo la foto de la que saliste.

24 cortes y 10 colores: 240 looks, todos sobre ti y no sobre una modelo. Loxa calcula la forma de tu cara en el propio teléfono, a partir de tu foto, y te enseña primero los cortes que suelen favorecerla; ese dato nunca sale del teléfono. Y si lo pides, uno de los modelos de IA de visión más recientes mira tu foto, dice qué forma tiene tu cara y elige los cortes que le favorecen, con un motivo para cada uno: incluido con cualquier saldo de créditos, y esas fotos no se guardan. Cada look que hagas se guarda en una galería, con la foto original, para volver a compararlo o enseñárselo a tu peluquero.

Tu primera foto es gratis, una vez. Después, y sin publicidad:
• Loxa Weekly: 20 fotos por semana, 9,99 € a la semana. Primera semana 0,99 €.
• Una foto suelta: 0,99 €, sin suscripción.
Los créditos semanales se renuevan cada lunes y no se acumulan; una foto suelta que compres no caduca. El pago se carga a tu cuenta de Apple al confirmar la compra y la suscripción se renueva sola salvo que la canceles al menos 24 horas antes del final de la semana, desde los ajustes de tu cuenta de Apple.

Antes de enviar la primera foto, Loxa te dice adónde va y te pide que lo aceptes; si dices que no, no se envía nada. Sin cuenta, sin registro y sin correo electrónico. Tu foto no se guarda en nuestros servidores y no usamos SDK de analítica ni de publicidad.

Términos de uso: https://loxa.blankhexadecimal.com/terms
Política de privacidad: https://loxa.blankhexadecimal.com/privacy-policy
Contrato de licencia estándar de Apple (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

## Spanish (Mexico)

Same copy as Spain with the Mexican storefront's own prices — the App Store
charges MXN 199.00 and MXN 19.00 there, so quoting euros would be wrong on the
listing a reader in Mexico actually sees.

**Subtitle**

```
Tu cara, antes de las tijeras
```

**Keywords**

```
peinado,cabello,pelo,corte,color,forma de cara,probar,peluqueria,rubio,flequillo,melena,selfie
```

**Promotional text**

```
Tu primera foto es gratis. 24 cortes y 10 colores sobre tu propia cara, con los que favorecen a tu tipo de cara primero.
```

**Description**

```
Loxa pone un corte distinto y un color distinto sobre tu propia cara. Entra tu foto y vuelve la misma cara, con otro pelo — para ver el cambio antes de que nadie coja las tijeras.

Haz una foto o elige una de tu galería, escoge un corte y un color, y en unos segundos te ves con él. Mantén pulsado el resultado para ver debajo la foto de la que saliste.

24 cortes y 10 colores: 240 looks, todos sobre ti y no sobre una modelo. Loxa calcula la forma de tu cara en el propio teléfono, a partir de tu foto, y te enseña primero los cortes que suelen favorecerla; ese dato nunca sale del teléfono. Y si lo pides, uno de los modelos de IA de visión más recientes mira tu foto, dice qué forma tiene tu cara y elige los cortes que le favorecen, con un motivo para cada uno: incluido con cualquier saldo de créditos, y esas fotos no se guardan. Cada look que hagas se guarda en una galería, con la foto original, para volver a compararlo o enseñárselo a tu peluquero.

Tu primera foto es gratis, una vez. Después, y sin publicidad:
• Loxa Weekly: 20 fotos por semana, 199 $ MXN a la semana. Primera semana 19 $ MXN.
• Una foto suelta: 19 $ MXN, sin suscripción.
Los créditos semanales se renuevan cada lunes y no se acumulan; una foto suelta que compres no caduca. El pago se carga a tu cuenta de Apple al confirmar la compra y la suscripción se renueva sola salvo que la canceles al menos 24 horas antes del final de la semana, desde los ajustes de tu cuenta de Apple.

Antes de enviar la primera foto, Loxa te dice adónde va y te pide que lo aceptes; si dices que no, no se envía nada. Sin cuenta, sin registro y sin correo electrónico. Tu foto no se guarda en nuestros servidores y no usamos SDK de analítica ni de publicidad.

Términos de uso: https://loxa.blankhexadecimal.com/terms
Política de privacidad: https://loxa.blankhexadecimal.com/privacy-policy
Contrato de licencia estándar de Apple (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

## French

**Subtitle**

```
Vous, avant les ciseaux
```

**Keywords**

```
coiffure,cheveux,coupe,couleur,coloration,forme du visage,essayer,salon,blond,frange,carre,selfie
```

**Promotional text**

```
Votre première photo est offerte. 24 coupes et 10 couleurs sur votre visage, celles qui vont à sa forme en premier.
```

**Description**

```
Loxa pose une autre coupe et une autre couleur sur votre propre visage. Votre photo entre ; le même visage revient, recoiffé — pour voir le changement avant que quiconque ne prenne les ciseaux.

Prenez une photo ou choisissez-en une dans votre galerie, choisissez une coupe et une couleur, et vous vous voyez avec en quelques secondes. Maintenez le résultat appuyé pour revoir la photo de départ en dessous.

24 coupes et 10 couleurs : 240 looks, sur vous et non sur un mannequin. Loxa estime la forme de votre visage sur le téléphone, à partir de votre photo, et vous montre d'abord les coupes qui lui vont souvent ; cette information ne quitte jamais le téléphone. Et si vous le demandez, l'un des tout derniers modèles d'IA visuelle regarde votre photo, nomme la forme de votre visage et choisit les coupes qui lui vont, avec une phrase d'explication pour chacune : inclus avec tout solde de crédits, et ces photos ne sont pas conservées. Chaque look est gardé dans une galerie, avec la photo d'origine, pour le comparer à nouveau ou le montrer à votre coiffeur.

Votre première photo est offerte, une fois. Ensuite, sans publicité :
• Loxa Weekly : 20 photos par semaine, 9,99 € par semaine. Première semaine 0,99 €.
• Une photo : 0,99 €, sans abonnement.
Les crédits hebdomadaires repartent chaque lundi et ne se cumulent pas ; une photo achetée à l'unité n'expire jamais. Le paiement est débité de votre compte Apple à la confirmation de l'achat et l'abonnement se renouvelle automatiquement sauf résiliation au moins 24 heures avant la fin de la semaine, depuis les réglages de votre compte Apple.

Avant l'envoi de la première photo, Loxa vous indique où elle va et vous demande votre accord ; si vous refusez, rien n'est envoyé. Pas de compte, pas d'inscription, pas d'adresse e-mail. Votre photo n'est pas conservée sur nos serveurs et nous n'utilisons aucun SDK d'analyse ou de publicité.

Conditions d'utilisation : https://loxa.blankhexadecimal.com/terms
Politique de confidentialité : https://loxa.blankhexadecimal.com/privacy-policy
Contrat de licence standard d'Apple (CLUF) : https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

## German

**Subtitle**

```
Dein Gesicht, vor der Schere
```

**Keywords**

```
frisuren,haare,haarschnitt,farbe,haarfarbe,gesichtsform,ausprobieren,friseur,blond,pony,bob,selfie
```

**Promotional text**

```
Dein erstes Foto ist gratis. 24 Schnitte und 10 Farben auf deinem eigenen Gesicht, die zu deiner Gesichtsform passenden zuerst.
```

**Description**

```
Loxa setzt einen anderen Haarschnitt und eine andere Farbe auf dein eigenes Gesicht. Dein Foto geht hinein, dasselbe Gesicht kommt zurück — neu frisiert, damit du die Veränderung siehst, bevor jemand zur Schere greift.

Mach ein Foto oder wähle eines aus deiner Mediathek, such dir Schnitt und Farbe aus, und nach ein paar Sekunden siehst du dich damit. Halte das Ergebnis gedrückt, um das Ausgangsfoto darunter zu sehen.

24 Schnitte und 10 Farben: 240 Looks, auf dir und nicht auf einem Model. Loxa schätzt deine Gesichtsform auf dem Telefon aus deinem Foto und zeigt dir zuerst die Schnitte, die oft dazu passen; diese Angabe verlässt das Telefon nie. Und wenn du willst, sieht sich eines der neuesten KI-Bildmodelle dein Foto an, benennt deine Gesichtsform und wählt die Schnitte aus, die dazu passen — mit je einem Satz, warum. Mit jedem Guthaben enthalten, und diese Fotos werden nicht gespeichert. Jeder Look bleibt in einer Galerie, mit dem Originalfoto, zum erneuten Vergleichen oder um ihn deinem Friseur zu zeigen.

Dein erstes Foto ist gratis, einmal. Danach, ohne Werbung:
• Loxa Weekly: 20 Fotos pro Woche für 9,99 € pro Woche. Erste Woche 0,99 €.
• Einzelnes Foto: 0,99 €, ohne Abo.
Das wöchentliche Guthaben wird jeden Montag zurückgesetzt und nicht übertragen; ein einzeln gekauftes Foto verfällt nie. Die Zahlung wird bei Kaufbestätigung deinem Apple-Account belastet; das Abo verlängert sich automatisch, sofern es nicht mindestens 24 Stunden vor Ende der Woche in den Einstellungen deines Apple-Accounts gekündigt wird.

Bevor das erste Foto gesendet wird, sagt dir Loxa, wohin es geht, und fragt dich um Zustimmung; lehnst du ab, wird nichts gesendet. Kein Konto, keine Registrierung, keine E-Mail-Adresse. Dein Foto wird nicht auf unseren Servern gespeichert, und wir verwenden keine Analyse- oder Werbe-SDKs.

Nutzungsbedingungen: https://loxa.blankhexadecimal.com/terms
Datenschutzerklärung: https://loxa.blankhexadecimal.com/privacy-policy
Apples Standard-Lizenzvereinbarung (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

## Italian

**Subtitle**

```
Il tuo viso, prima del taglio
```

**Keywords**

```
capelli,acconciatura,colore,tinta,forma viso,provare,parrucchiere,biondo,frangia,selfie,caschetto
```

**Promotional text**

```
La prima foto è gratis. 24 tagli e 10 colori sul tuo viso, con quelli adatti alla sua forma per primi.
```

**Description**

```
Loxa mette un taglio diverso e un colore diverso sul tuo viso. Entra la tua foto e torna lo stesso viso, ripettinato — così vedi il cambiamento prima che qualcuno prenda le forbici.

Scatta una foto o scegline una dalla galleria, scegli taglio e colore, e in pochi secondi ti vedi con quel look. Tieni premuto il risultato per rivedere sotto la foto di partenza.

24 tagli e 10 colori: 240 look, sul tuo viso e non su una modella. Loxa stima la forma del tuo viso sul telefono, dalla tua foto, e ti mostra prima i tagli che di solito le donano; questo dato non lascia mai il telefono. E se lo chiedi, uno dei più recenti modelli di IA visiva guarda la tua foto, dice che forma ha il tuo viso e sceglie i tagli che gli donano, con una frase di spiegazione per ciascuno: incluso con qualsiasi saldo di crediti, e quelle foto non vengono conservate. Ogni look resta in una galleria, con la foto originale, per confrontarlo di nuovo o mostrarlo al tuo parrucchiere.

La prima foto è gratis, una volta. Poi, senza pubblicità:
• Loxa Weekly: 20 foto a settimana, 9,99 € a settimana. Prima settimana 0,99 €.
• Foto singola: 0,99 €, senza abbonamento.
I crediti settimanali si azzerano ogni lunedì e non si accumulano; una foto acquistata singolarmente non scade mai. Il pagamento viene addebitato sull'account Apple alla conferma dell'acquisto e l'abbonamento si rinnova da solo salvo disdetta almeno 24 ore prima della fine della settimana, dalle impostazioni dell'account Apple.

Prima che la prima foto venga inviata, Loxa ti dice dove va e ti chiede di accettare; se rifiuti, non viene inviato niente. Nessun account, nessuna registrazione, nessun indirizzo e-mail. La tua foto non viene conservata sui nostri server e non usiamo SDK di analisi o di pubblicità.

Termini d'uso: https://loxa.blankhexadecimal.com/terms
Informativa sulla privacy: https://loxa.blankhexadecimal.com/privacy-policy
Contratto di licenza standard Apple (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
```

## Screenshots

`screenshots/store/01–05.png`, 1320 × 2868 (iPhone 6.9"), generated from the
raw simulator captures in `screenshots/` by
`tools/store-screenshots/generate.py`. Warm paper, Instrument Serif statement,
one phone per panel — the same system as the app and the marketing site.

| # | Line | Frame |
|---|---|---|
| 01 | Try on any hair *before the scissors.* | `10-preview-with-credits` |
| 02 | It hands back *your own face.* | `17-result` |
| 03 | Hold to see *the before.* | `18-result-hold-to-compare` |
| 04 | One face. *Every look.* | `20-result-platinum` |
| 05 | 24 cuts. *10 colours.* | the served catalogue art |

Panel 05 is not a phone. It is a 4 x 6 grid of the preview art the bucket
serves, one cut per cell with the colour rotating through all ten, built from
`GET /v1/catalogue` at generation time — so it cannot advertise a cut the app
does not ship, and a withdrawn style disappears from it on the next run.

**Nothing in the screenshots states the price** (2.3.2 is carried by the
description's "What it costs" section and by the App Store's own in-app
purchase list). The first photo is free and the description says "once"; if
review ever reads the gallery as promising more than that, the paywall frame —
`08-paywall-out-of-credits`, which shows both products and the renewal terms —
is the panel to put back.

**To re-shoot before resubmitting.** The frames above predate the 4.3(b)
changes. Two panels should show what is new, in place of 04 and 05:
the style strip with "suits you" marks and "Round face · suited first", and the
looks gallery. Panel 05's catalogue grid is the most category-generic image in
the set.

## The two products

App Store Connect keeps these on the product, not on the version, so they
survive a version bump and are edited in a different place from everything
above. Display name is capped at 35 characters, description at 55.

### Loxa Weekly — `loxa_weekly_999`

$9.99/week, first week $0.99 through the App Store's own introductory offer
("pay as you go", one week). Subscription group **Loxa Credits**, group display
name `Loxa` in all six locales.

| Locale | Display name | Description |
|---|---|---|
| English (U.S.) | Loxa Weekly | 20 hair try-on photos every week |
| Spanish (Spain) / (Mexico) | Loxa Semanal | 20 fotos de peinado cada semana |
| French | Loxa Hebdomadaire | 20 photos de coiffure chaque semaine |
| German | Loxa Wöchentlich | 20 Frisuren-Fotos jede Woche |
| Italian | Loxa Settimanale | 20 foto di acconciatura ogni settimana |

Review screenshot: `screenshots/04-onboarding-offer.jpg`.

### One more photo — `loxa_single_photo_099`

$0.99 consumable, no entitlement attached in RevenueCat on purpose: the Worker
verifies it by transaction id *and* product id
(`adapters/entitlements/revenuecat.ts`), so an entitlement would be a second
source of truth for the same fact.

| Locale | Display name | Description |
|---|---|---|
| English (U.S.) | One more photo | Single generation, no subscription. |
| Spanish (Spain) / (Mexico) | Una foto más | Una sola generación, sin suscripción. |
| French | Une photo de plus | Une seule génération, sans abonnement. |
| German | Noch ein Foto | Eine Generierung, kein Abo. |
| Italian | Un'altra foto | Una sola generazione, senza abbonamento. |

Review screenshot: `screenshots/08-paywall-out-of-credits.jpg`.

## The privacy nutrition label

Five types, all **Data Not Linked to You**, none used for tracking:

| Type | Purpose | Why it is collected at all |
|---|---|---|
| Photos or Videos | App Functionality | The render is cached for thirty days so a repeat does not cost a second credit. The photo you send is not stored. |
| Device ID | App Functionality | `device_credits` is keyed on it, and it is the RevenueCat customer id. |
| Purchase History | App Functionality | RevenueCat holds it; the Worker asks it whether a purchase happened. |
| Product Interaction | Analytics | The per-style tally, which carries no identifier. |
| Crash Data | App Functionality | The error reports, which carry no identifier and no photo. |

Product Interaction is the one `REVIEW_NOTES.md` does not mention: the tally is
in the privacy policy and it is stored, so it is disclosed.
