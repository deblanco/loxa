-- The credit ledger. Two tables, and between them they are the entire
-- enforcement mechanism.
--
-- `week` is the ISO week (`2026-W35`) the counter was last written in, stored
-- alongside the count rather than as a timestamp to expire. With the week
-- written next to the number, a Monday rollover is a comparison on read, not a
-- scheduled job — and this database has no cron to run one.
--
-- `free_used` is the "Continue free" credit: one photo for the lifetime of the
-- device, counted apart from the week so the Monday reset does not refill it. A
-- free tier that refills is a free tier somebody farms, and the model call is
-- the most expensive thing this product does.
--
-- `extra_credits` is the $0.99 consumable. It also sits outside the weekly
-- counter, for the opposite reason: it was paid for separately and must survive
-- the reset that wipes the allowance.
--
-- Spending goes weekly allowance, then the free credit, then the bought ones —
-- so the credit somebody paid cash for is always the last to go.
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
