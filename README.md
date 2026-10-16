# cth-super

The shadcn layer for the Super.so site (cthcom.super.site, Notion page CTH.com). Notion is the CMS and the backend, Super hosts it, and three small files make it look and behave like coachtonyhockey.com.

The owner's manual lives in Notion: CTH.com / x. Backend / **Site Guide**. This file is the technical map.

## Files

| File | What |
| --- | --- |
| `cth-ui.css` | All styling. Sections: tokens (Slate, black primary), bridge to Super's variables, base, blocks, databases, patterns, chrome, variants (`data-v` on blocks), site match (frame, hero, cards, pricing, FAQ, CTA), buttons, inner pages, switches. |
| `cth-studio.js` | Applies Notion-driven settings, builds the navbar and footer, rotates the hero words, adds card icons, locks the colour mode, shows the Style Studio panel on `?studio=1`. |
| `worker.js` | Cloudflare Worker `cth-super`: serves the static files and `/site.json`, which reads the public Notion page "Style Settings" (its tables, keyed by the heading above each) and the Home page's H2 anchors. |
| `cth-logo.svg` | The CTH wordmark used by the navbar and footer. |
| `preview.sh` | Fetches live pages, swaps in local CSS and the Studio script, writes `preview/`. |
| `ship.sh` | Commits, pushes, deploys the Worker. Live on next load. |

## How a change reaches the site

- **Content** (Notion pages): edit in Notion, then Super > Pages > refresh next to Sync.
- **Look and menus**: edit the Style Settings page tables in Notion. About 30 seconds. No Super step.
- **Code**: edit the files here, `./ship.sh "message"`. If a browser keeps an old copy, fetch with `cache: "reload"` or hard refresh.

## Super setup (one time per site)

- Settings > Notion Page URL: `https://app.notion.com/p/3fbcf93f7dd08063ab19d5e5464be9e1` (the CTH.com page, shared to the web).
- Code > Head:

```html
<link rel="stylesheet" href="https://cth-super.tonysteege.workers.dev/cth-ui.css">
<script src="https://cth-super.tonysteege.workers.dev/cth-studio.js" defer></script>
```

- Super's own navbar and footer are hidden by CSS; the script builds ours. Super's Design tab errors on this site, so design is done in CSS, not there.

## Conventions the CSS reads

Landing pages (first block is a Quote) get the hero, grid, section headers, cards, program rows, plan cards, FAQ split, CTA. Every other page is an article: centred column, sub-pages as link cards. Patterns are listed in the Site Guide. Per-block overrides are `{word}` tags at the start of a block.

## Switches (data attributes on `<html>`, set from the Style Settings table)

`theme`, `font`, `radius`, `width`, `buttons`, `btn` (flow or flat), `navbar`, `headings`, `dividers`, `frame`, `pattern`, `grid`, `motion`, `colors`, `hero`, plus the accent colour and Color Mode (light, dark, follow visitor; default light).

## Gotchas

- React hydration: the script waits about a second after load before editing page text, or React discards the edits.
- Super caches Notion content; refresh Sync after content edits.
- The worker reads Notion's unofficial public page endpoint. If it fails, the site keeps its cached look.
