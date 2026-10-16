// Serves /site.json: everything the site reads from Notion, so changes need no code.
//   tables: each table on the Site Settings page, keyed by the heading above it
//           (a table with no heading above it is "style")
//   anchors: heading text -> block id for every H2 on the Home page (for /#section links)
// Everything else is the static files. If Notion cannot be read the site keeps its last look.
const SETTINGS_PAGE = "3fbcf93f-7dd0-81c6-85ef-cf0d40e8a561";
const HOME_PAGE = "3fbcf93f-7dd0-8063-ab19-d5e5464be9e1";
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

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== "/site.json") return env.ASSETS.fetch(req);
    const head = { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=30" };
    try {
      const [settings, home] = await Promise.all([load(SETTINGS_PAGE), load(HOME_PAGE)]);
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
      const anchors = {};
      Object.keys(home.blocks).forEach((id) => {
        const b = home.blocks[id];
        if (b && b.type === "sub_header" && b.properties) anchors[text(b.properties.title)] = id.replace(/-/g, "");
      });
      return new Response(JSON.stringify({ tables, anchors }), { headers: head });
    } catch (e) {
      return new Response(JSON.stringify({ tables: {}, anchors: {}, error: String(e) }), { status: 502, headers: head });
    }
  },
};
