#!/usr/bin/env bash
#
# Push the generated catalogue to R2.
#
# Separate from the generator because the two fail for unrelated reasons and
# recover differently: a render dies on quota and is retried against Vertex, an
# upload dies on the network and is retried against Cloudflare. Re-running is
# safe — every object is written to the same key it was written to last time,
# so a half-finished catalogue can simply be uploaded again.
#
#   tools/generate-previews/upload.sh
#
set -euo pipefail

BUCKET=loxa-assets
CATALOGUE=catalogue.json
SELF="$(cd "$(dirname "$0")" && pwd)"
OUT="$(cd "$(dirname "$0")" && pwd)/catalogue"

if [ ! -d "$OUT/styles" ]; then
  echo "nothing to upload: $OUT/styles does not exist" >&2
  exit 1
fi

cd "$OUT"
total=$(find styles -name '*.jpg' | wc -l | tr -d ' ')
echo "uploading $total objects to $BUCKET"

n=0
for key in $(find styles -name '*.jpg'); do
  n=$((n + 1))
  # Immutable: a key is written once and its contents never change, so the
  # picture can be cached for a year and the app never revalidates it.
  if bunx wrangler r2 object put "$BUCKET/$key" \
      --file="$key" \
      --content-type=image/jpeg \
      --cache-control="public, max-age=31536000, immutable" \
      --remote >/dev/null 2>&1; then
    echo "  $n/$total  $key"
  else
    echo "  $n/$total  FAILED $key" >&2
  fi
done

# The manifest last, and never before the pictures it names.
#
# It is the only mutable object in this bucket: every key above is written once
# and cached for a year, which is what lets the app trust a preview URL forever.
# This one is overwritten on purpose -- it is how the catalogue changes without
# an app release -- so it gets a minute of cache rather than a year, and the
# Worker serves it with its own headers on top.
#
# Uploading it before the art would advertise keys that are not in the bucket
# yet, and every app that fetched in between would draw a hatch for a picture
# that exists.
echo "building the manifest"
bun run "$SELF/manifest.ts" --write

echo "uploading $CATALOGUE"
bunx wrangler r2 object put "$BUCKET/$CATALOGUE" \
  --file="$CATALOGUE" \
  --content-type=application/json \
  --cache-control="public, max-age=60" \
  --remote

echo "done"
