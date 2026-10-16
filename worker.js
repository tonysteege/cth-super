// Serves /style.json: the rows of the Style Settings table on the published
// Notion page, read straight from Notion. Everything else is the static files.
const PAGE_ID = "3fbcf93f-7dd0-81c6-85ef-cf0d40e8a561";
const HOST = "https://coachtonyhockey.notion.site";
const text = (prop) => (prop || []).map((s) => s[0]).join("").trim();
const unwrap = (b) => (b && b.value && b.value.value) || (b && b.value) || null;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== "/style.json") return env.ASSETS.fetch(req);
    const head = { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "public, max-age=30" };
    try {
      const r = await fetch(HOST + "/api/v3/loadPageChunk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page: { id: PAGE_ID }, limit: 200, cursor: { stack: [] }, chunkNumber: 0, verticalColumns: false }),
      });
      const data = await r.json();
      const blocks = {};
      Object.keys(data.recordMap.block).forEach((id) => { blocks[id] = unwrap(data.recordMap.block[id]); });
      const table = Object.values(blocks).find((b) => b && b.type === "table");
      const cols = table.format.table_block_column_order;
      const rows = (table.content || []).map((id) => {
        const p = (blocks[id] && blocks[id].properties) || {};
        return cols.map((c) => text(p[c]));
      });
      return new Response(JSON.stringify({ rows }), { headers: head });
    } catch (e) {
      return new Response(JSON.stringify({ rows: [], error: String(e) }), { status: 502, headers: head });
    }
  },
};
