#!/usr/bin/env bash
# Preview the shadcn layer on the live Super pages without publishing anything.
#
#   ./preview.sh                 fetch home + blocks, render light and dark PNGs
#   ./preview.sh blocks          one page
#   ./preview.sh home --no-png   just build the HTML (open preview/home.html)
#
# What it does: downloads the live page from coachtonyhockey.super.site, swaps
# the Ult stylesheet for the local cth-ui.css, adds the Style Studio panel
# (open preview/<page>.html?studio=1) and writes preview/<page>.html.
# Then it screenshots each with headless Chrome into preview/<page>-{light,dark}.png.
set -euo pipefail
cd "$(dirname "$0")"
SITE="https://coachtonyhockey.super.site"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGES=()
PNG=1
for a in "$@"; do
  case "$a" in
    --no-png) PNG=0 ;;
    *) PAGES+=("$a") ;;
  esac
done
[ ${#PAGES[@]} -eq 0 ] && PAGES=(home blocks)
mkdir -p preview

for p in "${PAGES[@]}"; do
  path="/$p"; [ "$p" = "home" ] && path="/"
  curl -sL "$SITE$path" -o "preview/$p.raw.html"
  python3 - "$p" <<'EOF'
import re, sys, pathlib
p = sys.argv[1]
h = pathlib.Path(f"preview/{p}.raw.html").read_text()
# absolute asset URLs so the page works from file://
h = h.replace('href="/', 'href="https://coachtonyhockey.super.site/').replace('src="/', 'src="https://coachtonyhockey.super.site/')
h = re.sub(r'srcSet="([^"]*)"', lambda m: 'srcSet="' + m.group(1).replace('/_next/', 'https://coachtonyhockey.super.site/_next/') + '"', h)
# swap Ult for the local stylesheet (cache-busted)
h = re.sub(r'<link[^>]*ult-v2\.css[^>]*>', '', h)
h = h.replace('</head>', '<link rel="stylesheet" href="../cth-ui.css?v=' + str(pathlib.Path("cth-ui.css").stat().st_mtime_ns) + '"></head>', 1)
# Style Studio panel (open the page with ?studio=1)
h = h.replace('</body>', '<script src="../cth-studio.js?v=' + str(pathlib.Path("cth-studio.js").stat().st_mtime_ns) + '"></script></body>', 1)
pathlib.Path(f"preview/{p}.html").write_text(h)
EOF
  rm -f "preview/$p.raw.html"
  echo "built preview/$p.html"
  if [ "$PNG" = 1 ]; then
    for mode in light dark; do
      "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,2400 \
        --screenshot="$PWD/preview/$p-$mode.png" "file://$PWD/preview/$p.html?theme=$mode" >/dev/null 2>&1 || true
      echo "  preview/$p-$mode.png"
    done
  fi
done
