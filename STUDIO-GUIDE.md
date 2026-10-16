## Style Guide

All the styling is controlled from one Notion page: **Style Settings** (CTH.com, x. Backend).

- Open it, change a word in the **Choice** column, and the site restyles within about a minute.
- To style one block only, type a word in curly braces at the start of it, like {outline}. The page lists every word.
- Optional preview: open any site page with ?studio=1 on the end to try looks with dropdowns, then Copy for Notion.

Under the hood: the Worker (worker.js) reads the table from the public Notion page and serves it at /style.json. It uses Notion's unofficial public page endpoint, so if Notion changes it the site simply keeps its last look.
