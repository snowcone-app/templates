/**
 * Zero-config sandbox shop, minted on the server.
 *
 * This example runs with NO `.env.local`: on first use the server mints a fresh
 * sandbox shop with one unauthenticated call and caches the id in module memory
 * for the process lifetime. A developer who clones (or remixes) this gets a
 * working render immediately — no shop to paste, no credential embedded in the
 * repo.
 *
 * Two non-negotiables:
 *  - **Server-only.** Minting must never run in the browser. This module is only
 *    ever imported from server code (the PDP page + the grant route), and a
 *    runtime guard throws if it is ever loaded in the browser. The minted
 *    `shop_id` is publishable (like a Stripe `pk_`) and is the only thing handed
 *    to the client.
 *  - **Env override wins.** Set `NEXT_PUBLIC_SNOWCONE_SHOP` to your own shop id
 *    (once you've claimed one) and minting is skipped entirely.
 *
 * Sandbox shops expire after ~30 days; a re-mint on cold start is fine.
 */

if (typeof window !== "undefined") {
  // Fail loud: minting bills/creates server-side and must never run client-side.
  throw new Error(
    "demo-shop.ts is server-only — it must never be imported into the browser bundle.",
  );
}

/** Backend base. Defaults to prod; override for a non-prod backend. */
const API_BASE = process.env.SNOWCONE_API_BASE ?? "https://api.snowcone.app";

/**
 * The `POST /shops/sandbox` response. Not an SDK type (it's a raw API response),
 * so we encode the documented shape here. Minting is ONE unauthenticated call —
 * no signup. The human `claim` step is only needed to get paid, not to render.
 */
interface SandboxShopResponse {
  shop_id: string;
  shop_secret: string;
  /** Shop-scoped key returned once; Bearer it on asset-write / AI-gen calls. */
  api_key: string;
  api_key_scopes: Array<
    "ai:generate" | "ai:bg-remove" | "uploads:write" | "mockups"
  >;
  claim: {
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    claim_token: string;
    expires_in: number;
  };
}

// Cached for the process lifetime. The in-flight promise is cached too, so a
// burst of first requests mints exactly one shop instead of racing N of them.
let mintedShop: Promise<string> | undefined;

async function mintSandboxShop(): Promise<string> {
  const res = await fetch(`${API_BASE}/shops/sandbox`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    // Never let Next cache this POST.
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `sandbox shop mint failed: ${res.status}${detail ? ` ${detail}` : ""}`,
    );
  }
  const shop = (await res.json()) as SandboxShopResponse;
  if (!shop.shop_id) {
    throw new Error("sandbox shop mint returned no shop_id");
  }
  return shop.shop_id;
}

/**
 * Resolve the demo shop id. Env override (`NEXT_PUBLIC_SNOWCONE_SHOP`) wins;
 * otherwise mint a sandbox shop once and reuse it for the process lifetime.
 * Server-only.
 */
export async function getDemoShopId(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SNOWCONE_SHOP;
  if (configured) return configured;

  // Cache the promise (not just the resolved value) so concurrent first calls
  // share one mint instead of each firing its own.
  mintedShop ??= mintSandboxShop().catch((err) => {
    // On failure, clear the cache so the next request retries the mint.
    mintedShop = undefined;
    throw err;
  });
  return mintedShop;
}
