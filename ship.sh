#!/bin/zsh
# Ship CTH Super styles: commit changed files, push, deploy all stylesheets,
# and purge jsdelivr as a backup.
#   ./ship.sh "message"
set -e
cd "$(dirname "$0")"
msg="${1:-update CTH Super styles}"
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -q -m "$msg"
fi
git push -q origin main
rm -rf dist && mkdir dist
cp ./*.css dist/
printf '/*\n  Cache-Control: no-cache\n  Access-Control-Allow-Origin: *\n' > dist/_headers
(unset CLOUDFLARE_API_TOKEN; npx --yes wrangler deploy 2>&1 | grep -E "Deployed|Version" )
for file in ./*.css; do
  name="${file#./}"
  curl -s "https://purge.jsdelivr.net/gh/tonysteege/cth-super@main/$name" >/dev/null || true
done
echo "Live styles: https://cth-super.tonysteege.workers.dev/"
