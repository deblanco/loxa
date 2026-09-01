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

-- What broke on somebody's phone.
--
-- The app has no way to tell us that a render failed, a promise was dropped or
-- a screen threw: it catches what it can, shows what it can, and the rest is
-- silent. This table is the other end of that. See
-- `apps/mobile/src/diagnostics/` for what is collected and what is scrubbed
-- before it leaves the device.
--
-- **There is no device_id column, and that is the design.** `style_use` above
-- carries none for the same reason: a counter that cannot say who is a counter,
-- and a crash log that can say who is a record of one person's bad afternoon.
-- The cost is real and was accepted — one phone crashing four hundred times and
-- four hundred phones crashing once are the same picture from here. The device
-- id *is* used to rate-limit the endpoint, in KV, and is never written here;
-- the privacy policy says so in those words. Adding this column later means
-- changing that page first.
--
-- `breadcrumbs` is JSON rather than a child table. It is read by a human
-- eyeballing one row, never joined or aggregated, and 240 rows of style counts
-- is the only place in this database where a second table earned itself.
--
-- Rows are pruned to thirty days on write — this database has no cron, the same
-- reason the weekly credit reset is a comparison on read. Thirty days matches
-- the render cache and the retention the privacy policy already commits to.
CREATE TABLE IF NOT EXISTS diagnostic_report (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  message     TEXT NOT NULL,
  stack       TEXT,
  route       TEXT,
  app_version TEXT NOT NULL,
  os_version  TEXT NOT NULL,
  locale      TEXT NOT NULL,
  breadcrumbs TEXT NOT NULL,
  reported_at TEXT NOT NULL
);

-- The prune deletes by age on every write, so this index is what stops that
-- being a scan of the whole table.
CREATE INDEX IF NOT EXISTS diagnostic_report_at ON diagnostic_report (reported_at);
