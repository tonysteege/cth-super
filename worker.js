// Serves /site.json: everything the site reads from Notion, so changes need no code.
//   tables: each table on the Site Settings page, keyed by the heading above it
//           (a table with no heading above it is "style")
//   anchors: heading text -> block id for every H2 on the Home page (for /#section links)
// Everything else is the static files. If Notion cannot be read the site keeps its last look.
const SETTINGS_PAGE = "3fbcf93f-7dd0-81c6-85ef-cf0d40e8a561";
const HOME_PAGE = "3fbcf93f-7dd0-8063-ab19-d5e5464be9e1";
const TIERS = { collection: "48ce2b14-3167-44dd-ba69-f8dc81528dd6", view: "3fccf93f-7dd0-81a8-baaa-000c04d1320f" };
const SETTINGS_DB = { collection: "2937a8f4-4a83-4496-8f55-0f9e01f402c4", view: "c07e3efc-c3ac-493c-8521-fb3182532597" };
const MENUS_DB = { collection: "aacd2b21-0a8b-4b42-aaff-2f5cf9490b80", view: "bd89a542-614e-49ed-a826-f0e9d707eb2b" };
const STYLE_PROPS = ["Color Theme", "Font", "Corners", "Page Width", "Buttons", "Button Style", "Navbar", "Section Headings", "Section Dividers", "Page Frame", "Background Pattern", "Hero Grid", "Animations", "Color Mode", "Callout Colors", "Top Quote as Hero", "Sub-Pages", "Shadows", "Card Style", "Text Size", "Heading Weight", "Line Spacing", "Callouts", "Quotes", "Toggles", "Feature Cards", "Tables", "Code", "Images", "Dividers"];
const ACCENTS = { Cyan: "#54d0ec", Blue: "#3b82f6", Green: "#22c55e", Orange: "#f97316", Rose: "#f43f5e", Violet: "#8b5cf6" };
const HOST = "https://coachtonyhockey.notion.site";
const text = (prop) => (prop || []).map((s) => s[0]).join("").trim();
const unwrap = (b) => (b && b.value && b.value.value) || (b && b.value) || null;

async function load(id) {
  const r = await fetch(HOST + "/api/v3/loadPageChunk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ page: { id }, limit: 400, cursor: { stack: [] }, chunkNumber: 0, verticalColumns: false }),
  });
  const data = await r.json();
  const blocks = {};
  Object.keys(data.recordMap.block).forEach((k) => { blocks[k] = unwrap(data.recordMap.block[k]); });
  return { blocks, page: blocks[id] };
}

// Reads every row of a public Notion database as {property name: text}.
async function readDb(src) {
  const r = await fetch(HOST + "/api/v3/queryCollection", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ collection: { id: src.collection }, collectionView: { id: src.view }, loader: { type: "reducer", reducers: { collection_group_results: { type: "results", limit: 200 } }, searchQuery: "", userTimeZone: "America/Los_Angeles" } }),
  });
  const d = await r.json();
  const col = unwrap(d.recordMap.collection[src.collection]);
  const key = {}; Object.keys(col.schema).forEach((k) => { key[col.schema[k].name] = k; });
  return d.result.reducerResults.collection_group_results.blockIds.map((id) => {
    const p = (unwrap(d.recordMap.block[id]) || {}).properties || {};
    const row = { Name: text(p.title) };
    Object.keys(key).forEach((n) => { if (n !== "Name") row[n] = text(p[key[n]]); });
    return row;
  });
}
const byOrder = (a, b) => (parseFloat(a.Order) || 999) - (parseFloat(b.Order) || 999);
// The Settings and Menus databases become the same tables the Style Settings page used to supply.
async function fromDatabases() {
  const out = {};
  const [settings, menus] = await Promise.all([readDb(SETTINGS_DB).catch(() => []), readDb(MENUS_DB).catch(() => [])]);
  const row = settings.filter((r) => r.Status === "Live").sort(byOrder)[0];
  if (row) {
    const style = STYLE_PROPS.map((n) => [n, row[n]]).filter((x) => x[1]);
    const custom = /^#[0-9a-f]{6}$/i.test(row["Custom Accent"] || "") ? row["Custom Accent"] : ACCENTS[row["Accent Color"]] || "default";
    style.push(["Accent Color", custom]);
    out.style = style;
    out.site = ["Site Name", "Tagline", "Hero Words", "Email", "Instagram", "YouTube"].map((n) => [n, row[n] || ""]).filter((x) => x[1]);
  }
  const live = menus.filter((m) => m.Status === "Live").sort(byOrder);
  const nav = live.filter((m) => /^Navbar/.test(m.Placement)).map((m) => [m.Name, m.Link, /Button/.test(m.Placement) ? "Button" : "Link"]);
  const foot = live.filter((m) => /^Footer/.test(m.Placement)).map((m) => [m.Placement.replace(/^Footer:\s*/, ""), m.Name, m.Link]);
  if (nav.length) out.navbar = nav;
  if (foot.length) out.footer = foot;
  return out;
}

// Offers: every row of the Tiers table's "Live Offers" view (Live status, sorted by Order), by property name.
async function tiers() {
  const r = await fetch(HOST + "/api/v3/queryCollection", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ collection: { id: TIERS.collection }, collectionView: { id: TIERS.view }, loader: { type: "reducer", reducers: { collection_group_results: { type: "results", limit: 100 } }, searchQuery: "", userTimeZone: "America/Los_Angeles" } }),
  });
  const d = await r.json();
  const col = unwrap(d.recordMap.collection[TIERS.collection]);
  const key = {}; Object.keys(col.schema).forEach((k) => { key[col.schema[k].name] = k; });
  const ids = d.result.reducerResults.collection_group_results.blockIds;
  return ids.map((id) => {
    const p = (unwrap(d.recordMap.block[id]) || {}).properties || {};
    const g = (n) => text(p[n === "Name" ? "title" : key[n]]);
    return {
      name: g("Name"), type: g("Type"), price: g("Price"), unit: g("Unit"), summary: g("Summary"),
      features: (p[key["Features"]] ? text(p[key["Features"]]) : "").split("\n").map((x) => x.trim()).filter(Boolean),
      button: g("Button Label"), link: g("Buy Link"), recommended: /yes/i.test(g("Recommended")), grants: g("Grants Tier"),
    };
  }).filter((t) => t.name);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== "/site.json") return env.ASSETS.fetch(req);
    const head = { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=30" };
    try {
      const [settings, home, offers, dbTables] = await Promise.all([load(SETTINGS_PAGE), load(HOME_PAGE), tiers().catch(() => []), fromDatabases().catch(() => ({}))]);
      const tables = {};
      let last = "style";
      (settings.page.content || []).forEach((id) => {
        const b = settings.blocks[id]; if (!b) return;
        if (/^(header|sub_header|sub_sub_header)$/.test(b.type)) { last = text(b.properties && b.properties.title).toLowerCase(); return; }
        if (b.type !== "table") return;
        const cols = b.format.table_block_column_order;
        tables[last] = (b.content || []).map((rid) => {
          const p = (settings.blocks[rid] && settings.blocks[rid].properties) || {};
          return cols.map((c) => text(p[c]));
        });
      });
      Object.assign(tables, dbTables);
      const anchors = {};
      Object.keys(home.blocks).forEach((id) => {
        const b = home.blocks[id];
        if (b && b.type === "sub_header" && b.properties) anchors[text(b.properties.title)] = id.replace(/-/g, "");
      });
      return new Response(JSON.stringify({ tables, anchors, tiers: offers }), { headers: head });
    } catch (e) {
      return new Response(JSON.stringify({ tables: {}, anchors: {}, error: String(e) }), { status: 502, headers: head });
    }
  },
};
