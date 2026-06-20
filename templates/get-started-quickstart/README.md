# get-started quickstart — as a CI gate

The `/get-started` page on developers.snowcone.app teaches the SDK path in code
snippets. Those snippets live in the docs page as **plain template-literal
strings**, and `apps/docs` has no typecheck step — so nothing ever compiles them.

A DX field report hit the exact gap that creates: an agent read
`product.combinations[0]` (top-level) and crashed at runtime, because in the
shipped type `combinations` is nested under `options`.

`src/quickstart.ts` is that same snippet as **real code, compiled against the
published `@snowcone-app/sdk`**. It exercises the documented field paths
(`product.options.combinations`, `product.mockups`, `product.placements`) and
encodes the `POST /shops/sandbox` mint-response shape as a typed contract. If a
documented path drifts from the shipped types, this goes **red in CI** instead of
a developer (or agent) rediscovering it.

## The canonical flow: mint on boot

No shop to paste, no credential embedded in your code. The quickstart leads with
minting a sandbox shop, then renders with the minted `shop_id`:

1. **Mint a sandbox shop** — `mintSandboxShop()` → `POST /shops/sandbox`, one
   unauthenticated call. No signup. You get back a publishable `shop_id` (like
   Stripe's `pk_`), a shop-scoped `api_key` (returned once), and a `claim` block.
   The human claim step is only needed to get **paid**, not to render.
2. **Render a sample image** — `useMintedShop(mint)` builds a mockup URL from the
   minted `shop_id` and a sample asset (`getMockupUrl(code, { shop, asset })`).
3. **(Optional) Upload your own art** — `uploadOwnArt(mint, file)` Bearers the
   minted `api_key` (`uploads:write` scope) to push art into the shop's bucket,
   then render that.

Like the other `examples/*`, this is intentionally **not** a pnpm workspace member
— it installs in isolation against the published package so it tests the shipped
types, not the local source.

```bash
pnpm install --ignore-workspace
pnpm typecheck
```

When you change a documented field path on the get-started page, change it here
too — keep the two in lockstep.
