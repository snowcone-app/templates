# Snowcone Templates

Official, remixable templates for [Snowcone](https://snowcone.app) — a
print-on-demand platform where a product mockup is just a URL.

Every template in `templates/` is a complete, runnable project, synced
automatically from the Snowcone monorepo. Each one embeds a public demo shop
key, so renders work the moment you start it — no signup required to explore.

## Run a template

```bash
cd templates/<name>
pnpm install
pnpm dev
```

## Templates

| Template | What it shows |
|---|---|
| [`pdp-realtime`](./templates/pdp-realtime) | A Next.js product page with a live mockup that re-renders as the customer edits the design |
| [`get-started-quickstart`](./templates/get-started-quickstart) | The smallest possible SDK integration — mint a shop, browse the catalog, build a mockup URL |

Browse them with live previews at [snowcone.app/templates](https://snowcone.app/templates).

## Docs

Full API reference, guides, and quickstarts: [developers.snowcone.app](https://developers.snowcone.app)

## Community templates

`community/` is where community-contributed templates will live. Pull
requests there are welcome — submissions are gated by automated checks
(coming soon).

## License

[MIT](./LICENSE)
