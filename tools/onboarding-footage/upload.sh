#!/usr/bin/env bash
#
# Push the onboarding footage to R2.
#
# The entry clips and the paywall wall, from the same files the app bundles.
# One copy on disk on purpose: the bundled asset and the served object are the
# same bytes, and a second copy in a tools folder would drift from the binary
# without anything noticing.
#
#   tools/onboarding-footage/upload.sh
#
# Unlike the catalogue, these keys are written more than once. The whole point
# of serving footage that also ships in the app is that a better shoot reaches
# people who will not take an update, and that only works if the key stays put
# and the object behind it changes. So they get a day of cache rather than a
# year, and re-running this is how the carousel is replaced.
#
# Nothing here is ever deleted. A missing object is not a hatch — it is a failed
# request, after which the app falls back to the copy in the binary, which is
# the footage this key was uploaded to replace.
set -euo pipefail

BUCKET=loxa-assets
SRC="$(cd "$(dirname "$0")/../../apps/mobile/assets/onboarding" && pwd)"

cd "$SRC"
files=$(ls entry-*.mp4 entry-*.jpg wall-*.mp4 wall-*.jpg)
total=$(echo "$files" | wc -l | tr -d ' ')
echo "uploading $total objects to $BUCKET/onboarding"

n=0
for file in $files; do
  n=$((n + 1))
  case "$file" in
    *.mp4) type=video/mp4 ;;
    *) type=image/jpeg ;;
  esac
  if bunx wrangler r2 object put "$BUCKET/onboarding/$file" \
      --file="$file" \
      --content-type="$type" \
      --cache-control="public, max-age=86400" \
      --remote >/dev/null 2>&1; then
    echo "  $n/$total  onboarding/$file"
  else
    echo "  $n/$total  FAILED onboarding/$file" >&2
  fi
done

echo "done"
