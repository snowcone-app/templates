# Live-mockup PDP (`@snowcone-app/example-pdp-realtime`)

**Runs with zero config — it mints a sandbox shop for you on first load.** Clone
or remix it, `pnpm install`, `pnpm dev`, and you get a live render immediately:
no shop id to paste, no credential embedded in the repo. The first paint shows a
real composited mockup of a sample image; type in the headline field and a fresh
mockup lands in the preview.

A cloneable Next.js product page built on the **`@snowcone-app/canvas/embed`**
primitives. No per-placement pixel upload — the server fetches your assets and
composites them (ADR-0079).

This is the **canonical embed example**, promoted into `examples/` as a
**CI-gated, compiling artifact** so the DX traps it used to take ~80 lines of
hand-wiring to avoid can't silently come back.

## Use your own image

The demo seeds a sample art URL so first paint shows something real. To use your
own art, either:

- **Pass a public image URL** — swap `SEED_ASSET` in `src/app/CanvasEditor.tsx`
  for any publicly fetchable image; the server fetches and composites it.
- **Upload your own** — the minted sandbox shop's `api_key` carries the
  `uploads:write` scope, so you can upload art into the shop's bucket and
  reference it by key. (See https://docs.snowcone.app/get-started.)

## The whole editor, in one tree

```tsx
import {
  RealtimeEmbed, RealtimeCanvas, RealtimeMockup,
  design, useTextBinding,
} from "@snowcone-app/canvas/embed";
import "@snowcone-app/canvas/style.css";

// ONE design() seeds BOTH the canvas and the first render — no second
// "seed state" to keep in sync. Named layers are what the bindings target.
const d = design({ name: "Front", width: 1480, height: 2328 })
  .image(artUrl, { anchor: "center", name: "art" })
  .text("SNOWCONE", { anchor: "top", name: "headline" });

<RealtimeEmbed
  shop={shop}              {/* resolved server-side: minted sandbox shop, or your own */}
  grantUrl="/api/realtime/grant"
  product={{ productId: "BEEB77", mockupIds: ["FV1qjO"], placements: ["Front"] }}
  design={d}
>
  <RealtimeCanvas>
    <HeadlineInput />     {/* your control — bound to the "headline" layer */}
  </RealtimeCanvas>
  <RealtimeMockup />      {/* live preview, linked through context */}
</RealtimeEmbed>

// "Bring your own UI." embed-only ships no chrome; useTextBinding wires an
// input to a named layer. Every keystroke re-renders the mockup.
function HeadlineInput() {
  const { text, setText, isConnected } = useTextBinding("headline");
  return <input value={text} onChange={(e) => setText(e.target.value)} disabled={!isConnected} />;
}
```

`<RealtimeEmbed>` owns the realtime session and makes every piece an embed needs
**required** at the type level — `shop`, `product`, `design`, and a grant source
(`grantUrl` or `grant`). There's no silently-optional prop to forget, and the
duplicate-seed-state footgun is gone: the `design` is the single source of truth.

## What's under the hood

`<RealtimeEmbed>` does, internally, what an embedder used to copy by hand:

```
RealtimeCanvas edit
  └─ serializeStateForServer(canvasState)        // canvas -> server RenderState
       └─ RenderSession.renderState('Front', …)  // @snowcone-app/sdk
            └─ grant from /api/realtime/grant      // same-origin proxy mints a grant
                 └─ wss://cdn.snowcone.app/realtime // streams the render
                      └─ mockup URL -> <RealtimeMockup/>
```

You only touch the grant proxy (a few lines, server-side) and your own controls.

### Mint on boot → grant route → live mockup

1. **Sandbox shop, minted on boot.** `src/lib/demo-shop.ts` resolves the shop
   id server-side: your `NEXT_PUBLIC_SNOWCONE_SHOP` if set, otherwise it mints a
   fresh sandbox shop with one **unauthenticated** `POST /shops/sandbox` call and
   caches the id in module memory for the process lifetime. Minting is
   **server-only** (it throws if imported into the browser); the publishable
   `shop_id` (like Stripe's `pk_`) is the only thing handed to the client. No
   signup — the human claim step is only needed to get paid, not to render.
   Sandbox shops expire after ~30 days; a re-mint on cold start is fine.
2. **Grant route** (`src/app/api/realtime/grant/route.ts`). The browser POSTs
   `{ shop }` (the minted id); the server calls `mintRealtimeGrant` and returns
   `{ token, expiresAt }`. If the browser omits `shop`, the route falls back to
   the same server-resolved demo shop. A production secret key (`sk_…`) **bills
   your account and must never reach the browser**, so it lives only here.
   Sandbox shops need no key (keyless publishable path).
3. **Live mockup.** `<RealtimeEmbed>` seeds the first render from the `design`,
   then re-renders on every edit. `<RealtimeMockup>` shows the result.

**Bring your own shop.** Once you've claimed a sandbox shop and want renders to
land in it, set `NEXT_PUBLIC_SNOWCONE_SHOP=shop_…` in `.env.local` — the env
override wins and minting is skipped.

## Catalog field → render arg mapping

`getProduct(id)` (in `src/lib/snowcone.ts`) reads the **public** catalog. The
fields map onto `RealtimeEmbed`'s `product` prop like this — getting these
crossed is the #1 silent-failure trap:

| Catalog field                      | `product` field                             | Namespace |
|-----------------------------------|---------------------------------------------|-----------|
| `product.mockups[].id`            | `mockupIds` (`string[]`)                     | scene code, e.g. `FV1qjO` |
| `product.placements[].label`      | `placements[]` — **and the `design` artboard `name`** | print-area name, e.g. `Front` |
| `product.options.combinations[].variantId` | `variantId`                        | gvid for the chosen variant |
| `product.mockups[].gvids[]`       | _(internal gvid namespace — not passed here)_ | gvid |

- **`mockupId` ≠ `placement`.** A mockupId is an opaque scene code; a placement
  is a print-area name. The `design`'s artboard `name` must equal the placement.
- **`variantId` is required when the product has a variant axis** (2+ distinct
  `variantId`s in `options.combinations`). Omit it and the render hangs; passing
  `options` lets the embed **fail fast** with an actionable error instead.
- **In dev, `validateEmbed` warns** (in the console) if the design's placement
  isn't a real product placement, or if two layers share a name.

## Files

| File | Role |
|---|---|
| `src/lib/demo-shop.ts` | Server-only shop resolver: env override or mint-a-sandbox-shop-on-boot (cached) |
| `src/lib/snowcone.ts` | SDK setup + `loadProduct` (`getProduct` helper, catalog→config; resolves the shop via `demo-shop`) |
| `src/app/page.tsx` | Server PDP — `loadProduct`, renders the editor |
| `src/app/Editor.tsx` | `ssr:false` dynamic wrapper (the editor is browser-only) |
| `src/app/CanvasEditor.tsx` | `<RealtimeEmbed>` + `<RealtimeCanvas>` + `<RealtimeMockup>`, a `design()` source of truth, and a `useTextBinding` control |
| `src/app/api/realtime/grant/route.ts` | Same-origin grant proxy (`mintRealtimeGrant`) |

## Run it

No `.env.local` needed — the server mints a sandbox shop on first load.

```bash
pnpm install   # isolated install — see below
pnpm dev       # http://localhost:9210  (renders immediately)
```

Bringing your own shop? `cp .env.example .env.local` and uncomment
`NEXT_PUBLIC_SNOWCONE_SHOP`.

## Why this isn't in the pnpm workspace

`examples/*` is intentionally **not** a workspace member (see the note in
`pnpm-workspace.yaml`). Encore Cloud builds the backend from the workspace root
and installs every member, so ~14 demo apps in the workspace would inflate every
backend deploy's `pnpm install`. Keeping examples out of the workspace keeps the
Encore deploy closure lean.

So this example installs in isolation: run `pnpm install` **inside this
directory**, where it resolves the published `@snowcone-app/{canvas,sdk,ui}`
from npm (pinned versions in `package.json`). It depends only on published
packages, never on a submodule package — safe for the Encore build.

## How CI gates it

A dedicated `example-pdp-realtime` job in `.github/workflows/ci.yml` runs an
isolated `pnpm install` here and then `pnpm typecheck` (`tsc --noEmit`) +
`pnpm build` (`next build`) on every PR. The example can't reach the live API in
CI, and it doesn't need to — the gate is that it **compiles and builds** against
the shipped `@snowcone-app/*` types. If a future SDK/canvas change breaks the
embed primitives' API, CI goes red here instead of a developer re-discovering it.
