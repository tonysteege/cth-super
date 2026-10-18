# Notion AI Site Maintenance

Updated: 2026-10-17

## Ownership And Source Of Truth

Notion AI is authorized to read, edit, test and deploy this site's custom code using Tony's connected GitHub and Cloudflare tools. Claude Code, a local Mac session and a handoff to another coding agent are not prerequisites.

- Repository: https://github.com/tonysteege/cth-super
- Live Super site: https://cthcom.super.site
- Custom-code Worker: https://cth-super.tonysteege.workers.dev
- Worker name: `cth-super`
- Cloudflare account: `b97f498a7e30fa4729971bf0c3fa4e7c`
- Operating Skill: https://app.notion.com/p/3fbcf93f7dd08195b15bc422b710ddd7
- Booking build status: https://app.notion.com/p/5b72a4112d9445c8a670cfb830747144

The Notion Skill owns the content patterns and operating instructions. This file owns the connected code-maintenance procedure. Read both at the start of site work. Historical local Claude Code skill copies are optional, not a prerequisite or authority over Tony's current instructions.

## Connections Required

1. Notion: read and write the relevant pages, schemas and Skill.
2. GitHub: read and write `tonysteege/cth-super`.
3. Cloudflare (connection currently labeled `Cloudfare`): read and deploy `cth-super`, plus separately authorized new app resources.

Connections belong to the account using them. Another user or a future session must have its own authorized access. Instructions cannot grant permissions or guarantee that connections remain authorized. If access is missing, identify the exact connection and request reconnection; do not silently delegate to Claude Code or claim success.

Super's proprietary dashboard is separate from these code surfaces. The connected tools do not automatically provide a Super dashboard API or login. Use its authenticated browser only when a required setting cannot be changed through the connected tools. Never claim a Super dashboard change without verification.

## Read, Edit And Verify

1. Load the Notion Skill and applicable current AGENTS instructions. Read `README.md`, this guide and the current source from GitHub before editing. Pull the current branch, not a remembered sandbox checkout.
2. Use GitHub `get_file_contents` for reads and `push_files` for versioned changes. Use a feature branch for substantial changes; preserve unrelated edits. Record the commit SHA.
3. Test syntax and behavior locally. For UI changes, read Tony's current design files and inspect desktop/mobile, keyboard, dark/light and navigation behavior. Do not upload licensed Pro component source to this public repository.
4. Discover the current Cloudflare API schema with the `search` tool before invoking `execute`. Read current Worker settings and bindings before deploying. Preserve required existing bindings, assets and compatibility settings.
5. Deploy the tested revision through the connected Cloudflare API. Updating `worker.js` alone does not upload changed CSS or JavaScript assets: publish the matching asset bundle too. If the available path cannot publish assets safely, report that deployment blocker rather than overwriting the live service or claiming it shipped.
6. Verify actual deployed endpoints, the Super page and relevant behavior. A GitHub commit is not a deployment. A successful upload is not proof that the public site works.
7. Keep the last known-good source revision and deployment identifiers for rollback. Reverting GitHub alone does not roll back Cloudflare: redeploy matching source and assets.
8. Update this guide, README, the Notion Skill or Site Guide only where the changed facts belong. State what is committed, deployed, verified and still blocked separately.

## Code Map

- `cth-ui.css`: custom presentation and tokens.
- `cth-studio.js`: settings application, navbar, footer and client behavior after Super hydration.
- `worker.js`: public `/site.json` settings endpoint and asset routing.
- `wrangler.toml`: Worker and asset configuration.
- `ship.sh`: optional local-machine convenience, not a Notion AI requirement.

Super Head already references `cth-ui.css` and `cth-studio.js` on the custom-code Worker. Changes behind those stable addresses ordinarily do not require editing Head again. Verify this on the live site after deployment. Content edits may still require Super Pages Sync. Super editor preview does not run the custom Head script; test the actual published site or an isolated staging environment.

## Booking And Privacy Boundaries

Build a new isolated booking engine. Do not reuse, inspect secrets from, overwrite or depend on the retired booking test engines. Keep existing booking links unchanged until the replacement is tested and live activation is approved.

Keep CRM, minors' information, Bookings and Transactions private. Never publish them under CTH.com or serve them through public Notion endpoints. Runtime Notion, Stripe and email credentials are separate from the editor's connected tools. Store them as server-side secrets through an approved secure configuration flow, never in GitHub, Notion page text, browser code, logs or chat. Connected GitHub/Cloudflare access does not mean payment/authentication integration is configured.

Do not charge real cards, send real transactional messages, issue refunds, change DNS or activate live booking during tests. Preserve explicit approvals for prices, policies and live activation.
