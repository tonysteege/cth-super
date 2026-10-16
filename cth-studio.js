/* cth-studio.js | Style Studio for the Super.so shadcn layer
   - Applies the site's style choices (window.CTH, set in Super > Head).
   - Reads {name} tags typed at the start of a Notion block to style that one block.
   - Shows the Style Studio panel only when the page is opened with ?studio=1.
   Visitors never see the panel. */
(function () {
  var D = document, H = D.documentElement;
  var CSS_URL = "https://cth-super.tonysteege.workers.dev/cth-ui.css";
  var JS_URL = "https://cth-super.tonysteege.workers.dev/cth-studio.js";

  /* What can be changed. '' means "the default look". */
  var GLOBALS = [
    { k: "theme", label: "Color Theme", opts: [["", "Neutral"], ["blue", "Blue"], ["green", "Green"], ["orange", "Orange"], ["rose", "Rose"], ["violet", "Violet"], ["brand", "CTH Cyan"]] },
    { k: "font", label: "Font", opts: [["", "Geist"], ["inter", "Inter"], ["dm", "DM Sans"], ["serif", "Serif"], ["mono", "Mono"]] },
    { k: "radius", label: "Corners", opts: [["", "Medium"], ["none", "Square"], ["sm", "Small"], ["lg", "Large"], ["xl", "Extra Large"]] },
    { k: "width", label: "Page Width", opts: [["", "Narrow"], ["wide", "Wide"], ["full", "Full"]] },
    { k: "buttons", label: "Buttons", opts: [["", "Rounded"], ["pill", "Pill"], ["square", "Square"]] },
    { k: "navbar", label: "Navbar", opts: [["", "Blurred"], ["solid", "Solid"], ["clear", "Clear"], ["floating", "Floating"]] },
    { k: "headings", label: "Section Headings", opts: [["", "Plain"], ["rule", "Underline"], ["tick", "Accent Tick"], ["tight", "Tight and Bold"]] },
    { k: "colors", label: "Callout Colors", opts: [["", "Themed"], ["notion", "Notion Colors"]] },
    { k: "hero", label: "Top Quote as Hero", opts: [["", "On"], ["off", "Off"]] }
  ];
  var BLOCKS = [
    { k: "callout", label: "Callouts", opts: [["", "Alert"], ["soft", "Soft"], ["outline", "Outline"], ["solid", "Solid"], ["bar", "Side Bar"], ["brand", "Brand Tint"]] },
    { k: "quote", label: "Quotes", opts: [["", "Rule"], ["card", "Card"], ["panel", "Panel"], ["brand", "Brand Bar"], ["pull", "Pull Quote"]] },
    { k: "toggle", label: "Toggles", opts: [["", "Accordion"], ["card", "Cards"], ["filled", "Filled"], ["minimal", "Minimal"]] },
    { k: "cards", label: "Feature Cards", opts: [["", "Card"], ["flat", "Flat"], ["lift", "Lift on Hover"], ["brand", "Brand Top"]] },
    { k: "table", label: "Tables", opts: [["", "Standard"], ["striped", "Striped"], ["grid", "Grid"], ["minimal", "Minimal"]] },
    { k: "code", label: "Code", opts: [["", "Card"], ["dark", "Dark"], ["flush", "Flush"]] },
    { k: "image", label: "Images", opts: [["", "Rounded"], ["square", "Square"], ["shadow", "Shadow"], ["frame", "Frame"]] },
    { k: "divider", label: "Dividers", opts: [["", "Line"], ["dots", "Dots"], ["fade", "Fade"], ["bold", "Bold"]] }
  ];
  var FONT_URLS = {
    inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
    dm: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
    serif: "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&display=swap"
  };

  /* Which element each block key styles, and where a {tag} may be typed. */
  var SEL = {
    callout: ".notion-callout", quote: ".notion-quote", toggle: ".notion-toggle",
    cards: ".notion-column-list", table: ".notion-table__wrapper", code: ".notion-code",
    image: ".notion-image", divider: ".notion-divider"
  };
  var TAGBOX = {
    callout: ".notion-callout__content", toggle: ".notion-toggle__summary", cards: ".notion-callout__content",
    table: "td", code: ".notion-caption", image: ".notion-caption", quote: null, divider: null
  };
  var TAG_RE = /^\s*\{([a-z-]+)\}\s*/i;

  /* ---------- config ---------- */
  var cfg = {};
  var KEYS = GLOBALS.concat(BLOCKS).map(function (o) { return o.k; }).concat(["accent"]);
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var params = new URLSearchParams(location.search);
  if (params.get("studio") === "1") ls.set("cth-studio", "1");
  if (params.get("studio") === "0") { ls.del("cth-studio"); ls.del("cth-studio-cfg"); }
  var studioOn = ls.get("cth-studio") === "1";

  var SETTINGS_PATH = "/style-settings";
  function fromNotionTable(doc) {
    var map = {}, out = {};
    GLOBALS.concat(BLOCKS).forEach(function (o) { map[o.label.toLowerCase()] = o; });
    doc.querySelectorAll(".notion-table tr").forEach(function (tr) {
      var td = tr.querySelectorAll("td"); if (td.length < 2) return;
      var label = td[0].textContent.trim().toLowerCase(), val = td[1].textContent.trim().toLowerCase();
      if (label === "accent color") { out.accent = /^#[0-9a-f]{6}$/.test(val) ? val : ""; return; }
      var o = map[label]; if (!o) return;
      out[o.k] = "";
      o.opts.forEach(function (op) { if (op[0] && (op[0] === val || op[1].toLowerCase() === val)) out[o.k] = op[0]; });
    });
    return out;
  }
  function syncFromNotion() {
    fetch(SETTINGS_PATH, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (html) {
      if (!html) return;
      var found = fromNotionTable(new DOMParser().parseFromString(html, "text/html"));
      if (!Object.keys(found).length) return;
      var next = JSON.stringify(found);
      if (next !== ls.get("cth-notion-cfg")) { ls.set("cth-notion-cfg", next); load(); applyAll(); }
    }).catch(function () {});
  }
  function load() {
    var site = window.CTH || {}, notion = {};
    try { notion = JSON.parse(ls.get("cth-notion-cfg") || "{}"); } catch (e) {}
    KEYS.forEach(function (k) { cfg[k] = (k in notion) ? notion[k] : (site[k] || ""); });
    if (studioOn) {
      try { var saved = JSON.parse(ls.get("cth-studio-cfg") || "null"); if (saved) KEYS.forEach(function (k) { if (k in saved) cfg[k] = saved[k]; }); } catch (e) {}
    }
  }

  /* ---------- apply site-wide choices ---------- */
  function luminance(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return 0;
    var n = parseInt(m[1], 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function applyGlobals() {
    GLOBALS.forEach(function (g) {
      if (cfg[g.k]) H.setAttribute("data-cth-" + g.k, cfg[g.k]); else H.removeAttribute("data-cth-" + g.k);
    });
    if (cfg.accent) {
      H.style.setProperty("--brand", cfg.accent);
      H.style.setProperty("--brand-foreground", luminance(cfg.accent) > 0.4 ? "#0a0a0a" : "#fafafa");
    } else { H.style.removeProperty("--brand"); H.style.removeProperty("--brand-foreground"); }
    var f = FONT_URLS[cfg.font];
    if (f && !D.getElementById("cth-font-" + cfg.font)) {
      var l = D.createElement("link"); l.rel = "stylesheet"; l.href = f; l.id = "cth-font-" + cfg.font; D.head.appendChild(l);
    }
  }

  /* ---------- apply block styles ---------- */
  var overrides = new WeakMap();
  function firstText(root) {
    var w = D.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) if (n.nodeValue.trim()) return n;
    return null;
  }
  function readTag(key, el) {
    var box = el;
    if (TAGBOX[key]) { box = el.querySelector(TAGBOX[key]); if (!box) return null; }
    var t = firstText(box); if (!t) return null;
    var m = TAG_RE.exec(t.nodeValue); if (!m) return null;
    t.nodeValue = t.nodeValue.replace(TAG_RE, "");
    return m[1].toLowerCase();
  }
  function eligible(key, el) {
    if (key === "callout") return !el.closest(".notion-column") && !el.querySelector(".highlighted-background > a.notion-link");
    if (key === "quote") return !el.closest(".notion-column") && !(el.parentElement && el.parentElement.classList.contains("notion-root") && el === el.parentElement.querySelector(":scope > .notion-quote:first-child")) && !el.classList.contains("cth-hero");
    if (key === "toggle") return !/notion-toggle-heading/.test(el.className);
    if (key === "cards") return !!el.querySelector(".notion-column > .notion-callout:first-child");
    return true;
  }
  var pending = false;
  function applyBlocks() {
    pending = false;
    Object.keys(SEL).forEach(function (key) {
      D.querySelectorAll(SEL[key]).forEach(function (el) {
        var tag = readTag(key, el);
        if (tag) overrides.set(el, tag);
        var v = overrides.get(el) || (eligible(key, el) ? cfg[key] : "");
        if (v) { if (el.getAttribute("data-v") !== v) el.setAttribute("data-v", v); }
        else if (el.hasAttribute("data-v")) el.removeAttribute("data-v");
      });
    });
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(applyBlocks); } }
  function applyAll() { applyGlobals(); applyBlocks(); }

  /* ---------- Style Studio panel ---------- */
  function headCode() {
    var rows = [];
    GLOBALS.concat(BLOCKS).forEach(function (o) {
      var name = o.opts[0][1]; o.opts.forEach(function (op) { if (op[0] === cfg[o.k]) name = op[1]; });
      rows.push(o.label + "\t" + name);
    });
    rows.splice(GLOBALS.length, 0, "Accent Color\t" + (cfg.accent || "default"));
    return rows.join("\n");
  }
  function save() { ls.set("cth-studio-cfg", JSON.stringify(cfg)); }

  function buildPanel() {
    var css = D.createElement("style");
    css.textContent =
      "#cth-studio{position:fixed;right:14px;bottom:14px;z-index:2147483000;width:300px;max-height:min(82vh,720px);display:flex;flex-direction:column;background:var(--popover,#fff);color:var(--foreground,#111);border:1px solid var(--border,#e5e5e5);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.18);font:13px/1.3 var(--font-sans,system-ui,sans-serif)}" +
      "#cth-studio *{box-sizing:border-box}" +
      "#cth-studio header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--border,#e5e5e5);font-weight:600}" +
      "#cth-studio header button{border:0;background:transparent;color:var(--muted-foreground,#666);cursor:pointer;font-size:12px;padding:2px 6px;border-radius:6px}" +
      "#cth-studio header button:hover{background:var(--accent,#f4f4f4)}" +
      "#cth-studio .body{overflow:auto;padding:6px 12px 10px}" +
      "#cth-studio h4{margin:12px 0 6px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted-foreground,#666)}" +
      "#cth-studio .row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:5px 0}" +
      "#cth-studio select,#cth-studio input[type=color]{font:inherit;height:28px;border:1px solid var(--input,#ddd);border-radius:6px;background:var(--background,#fff);color:inherit;padding:0 6px;max-width:150px}" +
      "#cth-studio input[type=color]{width:44px;padding:2px;cursor:pointer}" +
      "#cth-studio footer{display:flex;gap:6px;padding:10px 12px;border-top:1px solid var(--border,#e5e5e5)}" +
      "#cth-studio footer button{flex:1;height:32px;border-radius:8px;font:inherit;font-weight:500;cursor:pointer;border:1px solid var(--input,#ddd);background:var(--background,#fff);color:inherit}" +
      "#cth-studio footer button.p{background:var(--primary,#111);color:var(--primary-foreground,#fff);border-color:transparent}" +
      "#cth-studio .hint{margin:10px 0 0;color:var(--muted-foreground,#666);font-size:12px;line-height:1.45}" +
      "#cth-studio .hint code{background:var(--muted,#f4f4f4);padding:1px 4px;border-radius:4px}" +
      "#cth-studio .msg{margin:8px 12px 0;padding:8px 10px;border-radius:8px;background:var(--brand-soft,#e8f8fc);font-size:12px;line-height:1.45}" +
      "#cth-studio textarea{width:100%;height:90px;margin-top:6px;font:11px/1.4 var(--font-mono,monospace);border:1px solid var(--input,#ddd);border-radius:6px;padding:6px;background:var(--background,#fff);color:inherit}" +
      "#cth-studio.min .body,#cth-studio.min footer,#cth-studio.min .msg{display:none}";
    D.head.appendChild(css);

    var p = D.createElement("div"); p.id = "cth-studio";
    var h = '<header><span>Style Studio</span><span><button data-a="min">Hide</button><button data-a="close">Close</button></span></header><div class="body">';
    h += '<h4>Whole Site</h4>';
    GLOBALS.forEach(function (g) { h += field(g); });
    h += '<div class="row"><label>Accent Color</label><span><input type="color" data-k="accent" value="' + (cfg.accent || "#54d0ec") + '"> <button data-a="accent-reset" style="border:0;background:none;cursor:pointer;color:var(--muted-foreground)">Reset</button></span></div>';
    h += '<div class="row"><label>Preview Mode</label><select data-a="mode"><option value="">Site Setting</option><option value="light">Light</option><option value="dark">Dark</option></select></div>';
    h += '<h4>Each Block Type</h4>';
    BLOCKS.forEach(function (b) { h += field(b); });
    h += '<p class="hint">Style one block only: type its look in curly braces at the very start of the block in Notion, like <code>{outline}</code> or <code>{pull}</code>. It is hidden on the live site.</p>';
    h += '</div><div class="msg" hidden></div><footer><button class="p" data-a="copy">Copy for Notion</button><button data-a="reset">Reset All</button></footer>';
    p.innerHTML = h; D.body.appendChild(p);

    p.addEventListener("change", function (e) {
      var t = e.target, k = t.getAttribute("data-k"), a = t.getAttribute("data-a");
      if (k) { cfg[k] = t.value; save(); applyAll(); }
      if (a === "mode") { H.classList.remove("theme-light", "theme-dark"); if (t.value) H.classList.add("theme-" + t.value); }
    });
    p.addEventListener("input", function (e) {
      var t = e.target; if (t.getAttribute("data-k") === "accent") { cfg.accent = t.value; save(); applyGlobals(); }
    });
    p.addEventListener("click", function (e) {
      var a = e.target.getAttribute && e.target.getAttribute("data-a"); if (!a) return;
      if (a === "min") { p.classList.toggle("min"); e.target.textContent = p.classList.contains("min") ? "Show" : "Hide"; }
      if (a === "close") { ls.del("cth-studio"); p.remove(); }
      if (a === "accent-reset") { cfg.accent = ""; save(); applyGlobals(); }
      if (a === "reset") { KEYS.forEach(function (k) { cfg[k] = ""; }); save(); applyAll(); p.querySelectorAll("select[data-k]").forEach(function (s) { s.value = ""; }); }
      if (a === "copy") copy(p);
    });
  }
  function field(o) {
    var s = '<div class="row"><label>' + o.label + '</label><select data-k="' + o.k + '">';
    o.opts.forEach(function (op) { s += '<option value="' + op[0] + '"' + (cfg[o.k] === op[0] ? " selected" : "") + ">" + op[1] + "</option>"; });
    return s + "</select></div>";
  }
  function copy(p) {
    var code = headCode(), msg = p.querySelector(".msg");
    msg.hidden = false;
    msg.innerHTML = "Copied. In Notion, open your Style Settings page, click the first Choice cell, and paste.";
    function fallback() { msg.innerHTML += '<textarea readonly></textarea>'; var ta = msg.querySelector("textarea"); ta.value = code; ta.select(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).catch(fallback); else fallback();
  }

  /* ---------- start ---------- */
  load(); applyGlobals(); syncFromNotion();
  function ready() {
    applyBlocks();
    var root = D.querySelector(".super-root") || D.body;
    new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    if (studioOn) buildPanel();
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", ready); else ready();
  window.addEventListener("load", schedule);
})();
