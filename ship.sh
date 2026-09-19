#!/bin/zsh
# Ship cth-ui.css: commit whatever changed, push to GitHub, deploy to the
# Cloudflare Worker cth-super (the URL the Super site loads), purge jsdelivr
# as a backup.
#   ./ship.sh "message"
# The Worker copy is served with Cache-Control: no-cache, so every browser
# revalidates on each load and a deploy shows up on the next reload.
set -e
cd "$(dirname "$0")"
msg="${1:-update cth-ui.css}"
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -q -m "$msg

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
fi
git push -q origin main
rm -rf dist && mkdir dist
cp cth-ui.css dist/
printf '/*\n  Cache-Control: no-cache\n  Access-Control-Allow-Origin: *\n' > dist/_headers
(unset CLOUDFLARE_API_TOKEN; npx --yes wrangler deploy 2>&1 | grep -E "Deployed|Version" )
curl -s "https://purge.jsdelivr.net/gh/tonysteege/cth-super@main/cth-ui.css" >/dev/null || true
echo "Live: https://cth-super.tonysteege.workers.dev/cth-ui.css"
