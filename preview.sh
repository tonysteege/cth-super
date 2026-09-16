#!/usr/bin/env bash
# Preview the shadcn layer on the live Super pages without publishing anything.
#
#   ./preview.sh                 fetch home + blocks, render light and dark PNGs
#   ./preview.sh blocks          one page
#   ./preview.sh home --no-png   just build the HTML (open preview/home.html)
#
# What it does: downloads the live page from coachtonyhockey.super.site, swaps
# the Ult stylesheet for the local cth-ui.css, adds a floating switch bar
# (theme, colours, radius, width, hero) and writes preview/<page>.html.
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
# switch bar
bar = '''
<style>
#cth-bar{position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:var(--popover,#fff);color:var(--foreground,#111);border:1px solid var(--border,#e5e5e5);border-radius:10px;padding:8px 10px;font:12px/1 Geist,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.12)}
#cth-bar select,#cth-bar button{font:inherit;border:1px solid var(--border,#e5e5e5);background:var(--background,#fff);color:inherit;border-radius:6px;padding:4px 6px}
#cth-bar label{display:flex;gap:4px;align-items:center;color:var(--muted-foreground,#666)}
</style>
<div id="cth-bar">
 <label>theme <select data-k="theme"><option>light</option><option>dark</option></select></label>
 <label>colors <select data-k="colors"><option>themed</option><option>notion</option></select></label>
 <label>radius <select data-k="radius"><option>md</option><option>none</option><option>sm</option><option>lg</option><option>xl</option></select></label>
 <label>width <select data-k="width"><option>prose</option><option>wide</option><option>full</option></select></label>
 <label>hero <select data-k="hero"><option>on</option><option>off</option></select></label>
 <button onclick="location.reload()">reload</button>
</div>
<script>
(function(){
 var q=new URLSearchParams(location.search), html=document.documentElement;
 function apply(k,v){ if(k==='theme'){html.classList.remove('theme-light','theme-dark');html.classList.add('theme-'+v);} else html.setAttribute('data-cth-'+k,v); }
 document.querySelectorAll('#cth-bar select').forEach(function(s){
   var k=s.dataset.k, v=q.get(k)||localStorage.getItem('cth-'+k); if(v){s.value=v;apply(k,v);}
   s.onchange=function(){localStorage.setItem('cth-'+k,s.value);apply(k,s.value);};
 });
})();
</script>'''
h = h.replace('</body>', bar + '</body>', 1)
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
