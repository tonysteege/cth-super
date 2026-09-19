# cth-super

The shadcn layer for the Super.so site (coachtonyhockey.super.site, Notion pages under
CTH Admin / Website). One stylesheet, `cth-ui.css`, rewrites every block Super renders
into its shadcn equivalent, on the same tokens CTH Apps uses (neutral theme, Geist,
radius 0.625rem) plus the CTH cyan as `--brand`.

It replaces the Ult template stylesheet (`ult-v2.css`). Nothing else changes: Notion
stays the CMS, Super stays the host.

## Files

| File | What |
| --- | --- |
| `cth-ui.css` | The stylesheet. Sections: tokens, bridge to Super's variables, base, blocks, databases, patterns, chrome, switches. |
| `preview.sh` | Fetches the live Home and Blocks pages, swaps in the local CSS, adds a switch bar, writes `preview/*.html` and screenshots light and dark. |
| `preview/` | Generated. Open `preview/blocks.html` through `http://localhost:8651` (the `cth-super` server in `~/.claude/launch.json`) or any static server. |

## Install in Super

1. Super > Site > Settings > Code > **Head**: replace the Ult line with

   ```html
   <link rel="stylesheet" href="https://cth-super.tonysteege.workers.dev/cth-ui.css">
   ```

   This is a Cloudflare Worker serving `dist/` with `Cache-Control: no-cache`, so a deploy
   shows on the next reload. `https://cdn.jsdelivr.net/gh/tonysteege/cth-super@main/cth-ui.css`
   also works but caches for up to 12 hours.

2. Code > **CSS**: delete the three Ult leftovers if they are there
   (`.notion-callout:not([class*="bg-"]) { background-color: #fff !important }`,
   `.notion-callout__content { transform: translateY(5px) !important }`,
   `:root { --navbar-background-color: ... !important }`). The stylesheet neutralises
   them anyway, but they are dead weight.

3. Theme: keep "Copy of ult" or switch to Super's default. The stylesheet maps Super's
   own variables (`--color-*`, `--callout-*`, `--navbar-*`) onto the shadcn tokens, so
   theme settings mostly become no-ops. Anything you set in the Super theme editor
   that is *not* covered by the stylesheet still applies.

4. Options go on `<html>` through Code > Head, for example

   ```html
   <script>document.documentElement.dataset.cthRadius="lg";document.documentElement.dataset.cthWidth="wide";</script>
   ```

   | Attribute | Values | Default | Effect |
   | --- | --- | --- | --- |
   | `data-cth-colors` | `themed`, `notion` | themed | themed: callout colours collapse to shadcn roles (gray/brown muted, blue/purple brand tint, yellow warning, red destructive, rest accent). notion: keep the nine Notion hues. |
   | `data-cth-radius` | `none`, `sm`, `md`, `lg`, `xl` | md | Corner radius for every surface. |
   | `data-cth-width` | `prose`, `wide`, `full` | prose | Content measure: 44rem, 72rem, or the full page. |
   | `data-cth-hero` | `on`, `off` | on | Whether the first quote block on a page becomes a centred hero. |
   | `data-cth-logo-invert` | `on`, `off` | on | Invert the (black) logo image in dark mode. |

   Any token can be overridden in Code > CSS, e.g. `:root{--brand:#54d0ec;--radius:1rem}`.
   Dark mode follows Super's own toggle (`html.theme-dark`).

## Writing pages in Notion (the conventions the stylesheet reads)

Block to component:

| Notion block | Becomes |
| --- | --- |
| Callout | Alert (hairline border, radius, icon column). Coloured callouts follow `data-cth-colors`. |
| Quote | blockquote with a 2px 25% rule. Quote with a background: muted panel. |
| Toggle | Accordion item (rule underneath, chevron on the right). Toggle headings keep heading size. |
| To do | Checkbox (primary fill when checked, muted strike-through). |
| Code | Card with mono type, copy button on hover, caption as footer. |
| Simple table | shadcn Table. Header row and column supported. |
| Table of contents | Sidebar-style list with a hairline on the left. |
| Image, video, embed, PDF, file, bookmark | Rounded, hairline border. File becomes a download row. |
| Columns | Same widths as Notion; stack under 860px. |
| Database table / list / gallery / board | Table / list rows / Cards / Kanban columns. Selects become Badges. |

Patterns (arrangements of ordinary blocks):

| Arrangement | Becomes |
| --- | --- |
| **Hero**: first block on the page is a Quote holding a heading, a paragraph and links | Centred hero, big balanced headline, muted lead, buttons. Add a one-line coloured paragraph *above* the heading for an eyebrow pill. |
| **Button**: a link with a background colour (highlight the link text, pick a background) | Blue or purple: primary (black). Gray or brown: secondary. Default background: outline. Any other: brand cyan. A plain link stays a link. Native Notion buttons are primary. |
| **Feature grid**: columns that each start with a callout | Equal-height cards. |
| **Stat band**: columns that each start with a heading | Big tabular numbers with a muted label. |
| **FAQ**: toggles in a row | Accordion. |
| **Pricing**: simple table with header row and column | Plan table. |
| **Testimonials**: columns that each start with a quote | Quote cards, last line muted as attribution. |
| **Call to action**: a callout containing buttons | Centred CTA panel, icon hidden. |

Home page: the page cover is used as the full-bleed hero image (fades into the page), and
the page icon and title are hidden so the hero quote leads.

## Iterating

```bash
./preview.sh            # home + blocks, light + dark PNGs in preview/
./preview.sh blocks     # one page
./preview.sh --no-png   # HTML only
```

Then open `http://localhost:8651/preview/blocks.html` and use the switch bar (bottom
right) to flip theme, colours, radius, width and hero without editing anything.

The preview pulls the *published* Super page, so publish in Notion (Super picks it up in
a minute or so) to see new content. Databases only render after Super's client script
runs, so they do not appear in the static preview; check those on the live site.

## Publishing changes

```bash
./ship.sh "what changed"
```

Commits, pushes to GitHub, deploys the Worker (live in a few seconds), purges jsdelivr.
Then reload the site.
