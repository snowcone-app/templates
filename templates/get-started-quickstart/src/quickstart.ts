// The /get-started quickstart, as REAL compiled code.
//
// Why this file exists: the snippets on https://developers.snowcone.app/get-started
// live in the docs page as plain template-literal strings, and apps/docs has no
// typecheck step — so nothing compiles them. A DX field report hit exactly this
// gap: an agent read `product.combinations[0]` (top-level) and crashed at runtime,
// because in the shipped type `combinations` is nested under `options`. This file
// compiles the same snippet against the PUBLISHED @snowcone-app/sdk, so that class
// of doc/types drift goes RED in CI instead of being re-discovered by a developer.
//
// THE CANONICAL FLOW (mint on boot — no shop to paste, no credential in the repo):
//   1. mint a sandbox shop      → POST /shops/sandbox  (one unauthenticated call)
//   2. render a sample image    → getMockupUrl(code, { shop: shop_id, asset })
//   3. (optional) upload your own art with the minted api_key (uploads:write)
//
// If you change a documented field path on the get-started page, change it here
// too (or watch this fail). Keep the two in lockstep.

import { getProduct, getMockupUrl } from "@snowcone-app/sdk";

// A demo asset served from a public shop-storage origin. Swap for your own
// public image URL, or upload your own (see `uploadOwnArt` below).
const SAMPLE_ASSET = "https://dqMwU8Jct3.storage.snowcone.app/demo/demo-008.jpg";

// ── Step 2 of the quickstart: "Show product info" ────────────────────────────
// These are the exact accessors the docs display. The path that matters is
// `product.options?.combinations` — NOT `product.combinations`. Writing the
// latter (the agent's mistake) is a compile error here, which is the whole point.
export async function showProductInfo(code: string) {
  const product = await getProduct(code); // by id or slug

  const name = product.name; // "iPhone 17 Pro Max Case"
  const price = product.price; // minor units (cents) — suggested retail
  const description = product.description; // string[] — paragraphs

  // Fields a realtime render needs:
  const firstMockupId = product.mockups?.[0]?.id; // "947QAD" (a mockupId)
  const placementLabels = product.placements?.map((p) => p.label); // ["Front"]

  // The variant id lives under options.combinations — this is the line the
  // field report got wrong as `product.combinations[0]`.
  const variantId = product.options?.combinations?.find(
    (c) => c.variantId,
  )?.variantId;

  return { name, price, description, firstMockupId, placementLabels, variantId };
}

// ── Step 1 of the quickstart: "Render a mockup" ──────────────────────────────
// A mockup is a public image URL; getMockupUrl is the pure synchronous builder.
export function renderUrl(code: string, shop: string, asset: string): string {
  return getMockupUrl(code, { shop, asset });
}

// ── Step 0 of the quickstart: "Mint a sandbox shop" ──────────────────────────
// The canonical FIRST step. One unauthenticated call — no signup, no shop to
// paste, no credential embedded in your code. The human `claim` step is only
// needed to get PAID, not to render.
//
// The response is not an SDK type (it's a raw API response), so we encode the
// DOCUMENTED shape here as a typed contract — including the two top-level fields
// a fresh agent needs (`api_key` / `api_key_scopes`) and the corrected
// `claim.expires_in` (24h = 86400, not 604800). Verified live against
// api.snowcone.app.
export interface MintShopResponse {
  shop_id: string;
  shop_secret: string;
  /** Shop-scoped key, returned ONCE. Bearer it on the AI-gen / asset-write
   *  endpoints so generated/uploaded art persists into THIS shop's bucket. */
  api_key: string;
  api_key_scopes: Array<
    "ai:generate" | "ai:bg-remove" | "uploads:write" | "mockups"
  >;
  claim: {
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    claim_token: string;
    /** Seconds until the claim (and unclaimed shop) expires — 24h. */
    expires_in: number;
  };
}

/** Mint a fresh sandbox shop. SERVER-SIDE only (it returns a secret + a key). */
export async function mintSandboxShop(
  base = "https://api.snowcone.app",
): Promise<MintShopResponse> {
  const res = await fetch(`${base}/shops/sandbox`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`sandbox shop mint failed: ${res.status}`);
  }
  return (await res.json()) as MintShopResponse;
}

// ── Putting it together: mint → render a sample image ────────────────────────
// The minted `shop_id` is publishable (like Stripe's pk_) — it's the only thing
// the render URL needs. Render the sample asset right away.
export function useMintedShop(mint: MintShopResponse, asset = SAMPLE_ASSET): string {
  return renderUrl("BC43BE", mint.shop_id, asset);
}

// ── (Optional) Step 3: "Upload your own art" ─────────────────────────────────
// The minted key carries `uploads:write`, so you can push your own art into the
// shop's bucket and then render it. Uploads are a presigned-PUT flow: ask the
// API for a one-time URL (Bearer your minted api_key), PUT the bytes straight to
// storage, then the art is live at a public `{shop_id}.storage.snowcone.app` URL
// you can pass to `renderUrl`. Verified against api.snowcone.app.
export async function uploadOwnArt(
  mint: MintShopResponse,
  file: Blob,
  filename: string,
  base = "https://api.snowcone.app",
): Promise<string> {
  if (!mint.api_key_scopes.includes("uploads:write")) {
    throw new Error("minted key cannot upload art (missing uploads:write scope)");
  }

  // 1. Ask for a presigned upload URL — shop-scoped, so Bearer the minted key.
  const signRes = await fetch(`${base}/snowcone/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mint.api_key}`,
    },
    body: JSON.stringify({
      artworkId: "my-art",
      filename,
      contentType: file.type,
    }),
  });
  if (!signRes.ok) {
    throw new Error(`upload sign failed: ${signRes.status}`);
  }
  const { uploadUrl, key, publicUrl } = (await signRes.json()) as {
    uploadUrl: string;
    key: string;
    publicUrl: string;
  };

  // 2. PUT the bytes straight to storage (no API key — the URL is the grant).
  const putRes = await fetch(uploadUrl, { method: "PUT", body: file });
  if (!putRes.ok) {
    throw new Error(`upload PUT failed: ${putRes.status}`);
  }

  // 3. Classify the upload, then render it: renderUrl("BC43BE", shop_id, publicUrl).
  await fetch(`${base}/snowcone/upload/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

  return publicUrl; // https://{shop_id}.storage.snowcone.app/...
}
