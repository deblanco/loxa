/**
 * The facts a legal page cannot be written without, and which nobody but the
 * operator can supply.
 *
 * They render literally into both legal pages, and both pages are linked from
 * inside the app at every point of purchase as well as from App Store Connect.
 * A wrong value here is a wrong value on a page App Review reads.
 *
 * `JURISDICTION` is the country, not the adjective — "the law of Spain", not
 * "Spanish law" — because the terms name it that way and the privacy policy is
 * worded to match. Both pages should still be read by someone qualified; the
 * prose around these was written to be reviewed, not relied on.
 *
 * `LAST_UPDATED` is shared so the two pages cannot drift apart again; they were
 * four days out of step. Change it whenever either page's substance changes,
 * not when a typo is fixed.
 */
export const OPERATOR = "BLANK HEXADECIMAL, S.L.";
export const OPERATOR_ADDRESS =
  "Calle Illescas 46, piso 11, puerta 1, 28024 Madrid, Spain";
export const JURISDICTION = "Spain";
export const COURTS = "the courts of Madrid, Spain";

export const CONTACT_EMAIL = "hola@blankhexadecimal.com";
export const LAST_UPDATED = "1 September 2026";
