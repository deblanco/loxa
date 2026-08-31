-- The credit ledger. Two tables, and between them they are the entire
-- enforcement mechanism.
--
-- `week` is the ISO week (`2026-W35`) the counter was last written in, stored
-- alongside the count rather than as a timestamp to expire. With the week
-- written next to the number, a Monday rollover is a comparison on read, not a
-- scheduled job — and this database has no cron to run one.
--
-- `free_used` was the "Continue free" credit, one photo for the lifetime of the
-- device. That credit is withdrawn: `FREE_CREDITS` is 0 and nothing writes this
-- column any more. It is kept because devices that spent the credit while it
-- existed still carry a 1, and dropping it would be rewriting their history to
-- no purpose.
--
-- `extra_credits` is the $0.99 consumable. It sits outside the weekly counter
-- because it was paid for separately and must survive the reset that wipes the
-- allowance.
--
-- Spending goes weekly allowance, then the bought ones — so the credit somebody
-- paid cash for is always the last to go.
CREATE TABLE IF NOT EXISTS device_credits (
  device_id     TEXT    PRIMARY KEY,
  week          TEXT,
  week_used     INTEGER NOT NULL DEFAULT 0,
  free_used     INTEGER NOT NULL DEFAULT 0,
  extra_credits INTEGER NOT NULL DEFAULT 0
);

-- One row per consumable purchase we have already honoured.
--
-- Keyed on RevenueCat's transaction id, which is what makes the grant
-- idempotent: the app re-syncs its purchases on every launch and after every
-- restore, so the same id arrives many times and must be worth one credit in
-- total. `INSERT OR IGNORE` plus `changes()` is how the Worker tells a first
-- sighting from a replay.
CREATE TABLE IF NOT EXISTS credit_grant (
  transaction_id TEXT PRIMARY KEY,
  device_id      TEXT NOT NULL,
  granted_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS credit_grant_device ON credit_grant (device_id);

-- Which cuts and colours people actually pick.
--
-- One row per (cut, colour) pair rather than one per render: 24 cuts by 10
-- colours is 240 rows for the lifetime of the catalogue, so the table does not
-- grow with traffic and "most used" is an ORDER BY rather than a scan over
-- every render ever served.
--
-- Nothing here identifies a device, and that is the point of counting rather
-- than logging. The question this table answers is which cuts to render art for
-- next; a device id would turn a product counter into a record of what somebody
-- tried on their own face.
--
-- Two counters because they cost different money. `renders` is a model call we
-- paid for. `replays` is a cache hit — someone re-opening a picture that
-- already existed, which is real use and no spend. Summing them answers
-- popularity; `renders` alone answers the bill.
CREATE TABLE IF NOT EXISTS style_use (
  style_id  TEXT    NOT NULL,
  color_id  TEXT    NOT NULL,
  renders   INTEGER NOT NULL DEFAULT 0,
  replays   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (style_id, color_id)
);
