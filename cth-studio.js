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

  var SETTINGS_URL = (function () { var s = D.currentScript; return (s && s.src ? s.src.replace(/[^/]*$/, "") : "https://cth-super.tonysteege.workers.dev/") + "style.json"; })();
  function fromRows(rows) {
    var map = {}, out = {};
    GLOBALS.concat(BLOCKS).forEach(function (o) { map[o.label.toLowerCase()] = o; });
    rows.forEach(function (r) {
      var label = (r[0] || "").toLowerCase(), val = (r[1] || "").toLowerCase();
      if (label === "accent color") { out.accent = /^#[0-9a-f]{6}$/.test(val) ? val : ""; return; }
      var o = map[label]; if (!o) return;
      out[o.k] = "";
      o.opts.forEach(function (op) { if (op[0] && (op[0] === val || op[1].toLowerCase() === val)) out[o.k] = op[0]; });
    });
    return out;
  }
  function syncFromNotion() {
    fetch(SETTINGS_URL).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.rows || !j.rows.length) return;
      var found = fromRows(j.rows), next = JSON.stringify(found);
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
  /* Hero headline: "Accelerate Your {Skating, Puck Control} Development" cycles the words in braces. */
  function flipHero() {
    var h = D.querySelector(".notion-root > .notion-quote h1.notion-heading, .notion-root > .notion-quote h2.notion-heading");
    if (!h || (h._cthFlip && h.contains(h._cthFlip))) return;
    var t = firstText(h); if (!t) return;
    var m = /\{([^}]+)\}/.exec(t.nodeValue); if (!m) return;
    var words = m[1].split(",").map(function (w) { return w.trim(); }).filter(Boolean); if (!words.length) return;
    var span = D.createElement("span"); span.className = "cth-flip"; span.textContent = words[0];
    var after = D.createTextNode(t.nodeValue.slice(m.index + m[0].length));
    t.nodeValue = t.nodeValue.slice(0, m.index);
    t.parentNode.insertBefore(span, t.nextSibling); t.parentNode.insertBefore(after, span.nextSibling);
    h._cthFlip = span;
    if (words.length < 2 || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    var i = 0;
    setInterval(function () {
      span.classList.add("out");
      setTimeout(function () { i = (i + 1) % words.length; span.textContent = words[i]; span.classList.remove("out"); }, 220);
    }, 2400);
  }
  var pending = false, hydrated = false;
  window.addEventListener("load", function () { setTimeout(function () { hydrated = true; schedule(); }, 1200); });
  function applyBlocks() {
    pending = false;
    buildNav(); buildFooter();
    if (!hydrated) return;
    addIcons(); finishing();
    flipHero();
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


  /* ---------- icon tiles on the skills and pricing cards ---------- */
  var ICONS = {
    "skills foundations": '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    "technical skills": '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    "tactical skills": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    "team skills": '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    "athletic skills": '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    "mindset skills": '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    "sticktime": '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
    "skills lab": '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    "downhill skating camp": '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'
  };
  function addIcons() {
    D.querySelectorAll(".notion-column .notion-callout__content").forEach(function (c) {
      if (c.querySelector(".cth-ico")) return;
      var t = c.querySelector("p.notion-text"); if (!t) return;
      var d = ICONS[t.textContent.trim().toLowerCase()]; if (!d) return;
      var span = D.createElement("span"); span.className = "cth-ico";
      span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";
      c.insertBefore(span, c.firstChild);
    });
  }

  /* ---------- finishing details: title icons, avatars, pricing panels ---------- */
  var HICONS = {
    "skills lab membership": ICONS["skills lab"],
    "on-ice sticktimes": '<path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/>',
    "hybrid sticktimes": '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    "downhill skating camp": '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>'
  };
  function svgIcon(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; }
  function finishing() {
    D.querySelectorAll(".notion-column h3.notion-heading").forEach(function (h) {
      if (h.querySelector(".cth-hicon")) return;
      var d = HICONS[h.textContent.trim().toLowerCase()]; if (!d) return;
      var s = D.createElement("span"); s.className = "cth-hicon"; s.innerHTML = svgIcon(d); h.insertBefore(s, h.firstChild);
    });
    D.querySelectorAll(".notion-column > .notion-quote").forEach(function (q) {
      var st = q.querySelector("p.notion-text > strong"); if (!st || q.querySelector(".cth-avatar")) return;
      var ini = st.textContent.replace(/[^A-Za-z ]/g, "").trim().split(/\s+/).map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
      var a = D.createElement("span"); a.className = "cth-avatar"; a.textContent = ini; st.parentNode.insertBefore(a, st);
    });
    D.querySelectorAll(".notion-column-list .notion-callout .notion-callout__content").forEach(function (c) {
      if (c.querySelector(".cth-panel") || !c.querySelector("h2.notion-heading")) return;
      var kids = Array.prototype.slice.call(c.childNodes), btn = null;
      kids.forEach(function (k) { if (k.nodeType === 1 && k.matches && k.matches("p.notion-text") && k.querySelector(".highlighted-background")) btn = k; });
      if (!btn) return;
      var panel = D.createElement("div"); panel.className = "cth-panel";
      var end = kids.indexOf(btn);
      c.insertBefore(panel, kids[0]);
      kids.slice(0, end + 1).forEach(function (k) { panel.appendChild(k); });
    });
  }

  /* ---------- site navbar (logo, section links, theme toggle, button) ---------- */
  var NAV = {
    links: [["Programs", "Ways to train with me"], ["Camps", "https://coachtonyhockey.com/winter-camp-2026/"], ["Blog", "https://coachtonyhockey.com/blog"]],
    second: { text: "Join Skills Lab", href: "https://coachtonyhockey.com/bookings/join/skills-lab" },
    button: { text: "Book a session", href: "https://coachtonyhockey.com/bookings/" }
  };
  function sectionHref(headingText) {
    var hs = D.querySelectorAll("h2.notion-heading");
    for (var i = 0; i < hs.length; i++) if (hs[i].textContent.trim() === headingText) return "#" + hs[i].id.replace(/^block-/, "");
    return null;
  }
  function buildNav() {
    if (D.getElementById("cth-nav")) return;
    var base = JS_URL.replace(/[^/]*$/, "");
    var nav = D.createElement("header"); nav.id = "cth-nav";
    var links = "", mlinks = "";
    NAV.links.forEach(function (l) {
      var url = /^https?:/.test(l[1]) ? l[1] : (sectionHref(l[1]) ? "/" + sectionHref(l[1]) : null); if (!url) return;
      links += '<a href="' + url + '">' + l[0] + "</a>"; mlinks += '<a href="' + url + '">' + l[0] + "</a>";
    });
    nav.innerHTML = '<div class="cth-nav__bar"><a class="cth-nav__logo" href="/" aria-label="Home"><img src="' + base + 'cth-logo.svg" alt="CTH"></a>' +
      '<nav class="cth-nav__links">' + links + "</nav><div class=\"cth-nav__actions\">" +
            '<a class="cth-nav__sec" href="' + NAV.second.href + '">' + NAV.second.text + "</a>" +
      '<a class="cth-nav__cta" href="' + NAV.button.href + '">' + NAV.button.text + "</a>" +
      '<button class="cth-nav__icon cth-nav__burger" data-a="menu" aria-label="Menu"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div></div>' +
      '<nav class="cth-nav__menu">' + mlinks + "</nav>";
    D.body.insertBefore(nav, D.body.firstChild);
    H.classList.add("cth-has-nav");
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) { if (e.target.closest(".cth-nav__menu a")) nav.classList.remove("open"); return; }
      if (b.dataset.a === "menu") nav.classList.toggle("open");
    });
    nav.classList.toggle("scrolled", window.scrollY > 0);
  }
  window.addEventListener("scroll", function () { var n = D.getElementById("cth-nav"); if (n) n.classList.toggle("scrolled", window.scrollY > 0); }, { passive: true });
  /* The site is always light. */
  (function () {
    function lock() { if (!H.classList.contains("theme-light") || H.classList.contains("theme-dark")) { H.classList.remove("theme-dark"); H.classList.add("theme-light"); } }
    lock(); ls.del("cth-theme");
    new MutationObserver(lock).observe(H, { attributes: true, attributeFilter: ["class"] });
  })();

  /* ---------- site footer (from the live site's Footer rows) ---------- */
  var FOOT = {
    blurb: "Accelerate your development.", email: "tonysteege@coachtonyhockey.com", name: "Coach Tony Hockey",
    social: [["Instagram", "http://instagram.com/coachtonyhockey", '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/>'], ["YouTube", "https://www.youtube.com/@coachtonyhockey1214", '<path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8Z"/><path d="m10 15 5-3-5-3z"/>']],
    columns: [
      ["Programs", [["Skills Lab", "https://coachtonyhockey.com/bookings/join/skills-lab"], ["Sticktimes", "https://coachtonyhockey.com/bookings/"], ["Downhill Skating Camp", "https://coachtonyhockey.com/winter-camp-2026/"]]],
      ["Explore", [["Pricing", "#Pricing"], ["FAQ", "#FAQ"], ["Book a session", "https://coachtonyhockey.com/bookings/"]]]
    ]
  };
  function buildFooter() {
    if (D.getElementById("cth-foot")) return;
    var base = JS_URL.replace(/[^/]*$/, "");
    var icon = function (d) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; };
    var cols = FOOT.columns.map(function (c) {
      return '<div class="cth-foot__col"><div class="cth-foot__h">' + c[0] + "</div><ul>" + c[1].map(function (l) {
        var href = l[1].charAt(0) === "#" ? (sectionHref(l[1].slice(1)) ? "/" + sectionHref(l[1].slice(1)) : "/") : l[1];
        return '<li><a href="' + href + '">' + l[0] + "</a></li>";
      }).join("") + "</ul></div>";
    }).join("");
    var f = D.createElement("footer"); f.id = "cth-foot";
    f.innerHTML = '<div class="cth-foot__grid"><div class="cth-foot__brand"><a href="/"><img src="' + base + 'cth-logo.svg" alt="CTH"></a><p>' + FOOT.blurb + '</p><div class="cth-foot__rule"></div><div class="cth-foot__social">' +
      FOOT.social.map(function (x) { return '<a href="' + x[1] + '" aria-label="' + x[0] + '">' + icon(x[2]) + "</a>"; }).join("") + "</div></div>" +
      '<div class="cth-foot__cols">' + cols + '<div class="cth-foot__col cth-foot__touch"><div class="cth-foot__h">Get in touch</div><a class="cth-foot__mail" href="mailto:' + FOOT.email + '">' + icon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>') + FOOT.email + '</a><a class="cth-nav__cta" href="' + NAV.button.href + '">' + NAV.button.text + "</a></div></div></div>" +
      '<div class="cth-foot__legal">\u00a9' + new Date().getFullYear() + ' <a href="/">' + FOOT.name + "</a></div>";
    D.body.appendChild(f);
  }

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
    h += '<h4>Each Block Type</h4>';
    BLOCKS.forEach(function (b) { h += field(b); });
    h += '<p class="hint">Style one block only: type its look in curly braces at the very start of the block in Notion, like <code>{outline}</code> or <code>{pull}</code>. It is hidden on the live site.</p>';
    h += '</div><div class="msg" hidden></div><footer><button class="p" data-a="copy">Copy for Notion</button><button data-a="reset">Reset All</button></footer>';
    p.innerHTML = h; D.body.appendChild(p);

    p.addEventListener("change", function (e) {
      var t = e.target, k = t.getAttribute("data-k"), a = t.getAttribute("data-a");
      if (k) { cfg[k] = t.value; save(); applyAll(); }
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
    new MutationObserver(schedule).observe(D.documentElement, { childList: true, subtree: true });
    if (studioOn) buildPanel();
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", ready); else ready();
  window.addEventListener("load", schedule);
})();
