import { mintRealtimeGrant } from "@snowcone-app/sdk";
import { getDemoShopId } from "@/lib/demo-shop";

/**
 * Same-origin grant proxy (ADR-0079). The browser POSTs `{ shop }` here; we
 * mint a short-lived realtime grant server-side and hand back
 * `{ token, expiresAt }`.
 *
 * Zero-config: if the browser omits `shop`, we fall back to the server-resolved
 * demo shop — your `NEXT_PUBLIC_SNOWCONE_SHOP` if set, otherwise the sandbox
 * shop the server minted on boot. So this works with no `.env.local`.
 *
 * Why a proxy: a production secret key (sk_...) bills your account, so it must
 * NEVER reach the browser. For sandbox shops, omit SNOWCONE_API_KEY and the SDK
 * uses the keyless publishable grant path; for production, set an `sk_...` key
 * with the `mockups:realtime` scope (server env only).
 */
export async function POST(req: Request) {
  const apiKey = process.env.SNOWCONE_API_KEY;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const requested =
    body && typeof body === "object" && "shop" in body
      ? (body as { shop?: unknown }).shop
      : undefined;

  // Browser-provided shop wins; otherwise resolve the server demo shop (env
  // override or minted sandbox). Never require the caller to know the id.
  let shop: string;
  if (typeof requested === "string" && requested) {
    shop = requested;
  } else {
    try {
      shop = await getDemoShopId();
    } catch (err) {
      const message = err instanceof Error ? err.message : "could not resolve a shop";
      return Response.json({ error: message }, { status: 502 });
    }
  }

  try {
    const grant = await mintRealtimeGrant(
      apiKey
        ? {
            apiKey,
            shop,
            // Optional override for non-prod backends; defaults to https://api.snowcone.app.
            ...(process.env.SNOWCONE_API_BASE ? { base: process.env.SNOWCONE_API_BASE } : {}),
          }
        : { shop },
    );
    return Response.json(grant); // { token, expiresAt }
  } catch (err) {
    const message = err instanceof Error ? err.message : "grant failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
