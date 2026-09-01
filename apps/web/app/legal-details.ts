/**
 * The facts a legal page cannot be written without, and which nobody but the
 * operator can supply.
 *
 * **These are placeholders and they render literally, on purpose.** A page that
 * says "[registered name of the operator]" is obviously unfinished; a page that
 * names a plausible invented company is not, and the second failure is far
 * worse than the first. Fill these in before the site is announced, and have
 * both legal pages read by someone qualified — the prose around them is
 * boilerplate written to be reviewed, not relied on.
 *
 * `LAST_UPDATED` is shared so the two pages cannot drift apart again; they were
 * four days out of step. Change it whenever either page's substance changes,
 * not when a typo is fixed.
 */
export const OPERATOR = "[registered name of the operator]";
export const OPERATOR_ADDRESS = "[registered postal address]";
export const JURISDICTION = "[country or state whose law applies]";
export const COURTS = "[the courts with exclusive jurisdiction]";

export const CONTACT_EMAIL = "hola@blankhexadecimal.com";
export const LAST_UPDATED = "1 September 2026";
