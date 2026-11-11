import { getProduct, type RenderProductOptions } from "@snowcone-app/sdk";
import { getDemoShopId } from "./demo-shop";

/**
 * SDK setup + a thin `loadProduct` helper.
 *
 * `getProduct(idOrSlug)` reads the PUBLIC catalog (Meilisearch) — no secret
 * needed. It returns the catalog product whose fields map onto the realtime
 * render contract like this:
 *
 *   catalog field                  ->  realtime arg
 *   -----------------------------------------------------------------
 *   product.mockups[].id           ->  RenderProduct.mockupIds (string[])
 *   product.placements[].label     ->  renderState(placement, ...) (1st arg)
 *   product.options.combinations[] ->  RenderProduct.variantId (.variantId)
 *   product.mockups[].gvids[]      ->  the gvid namespace (internal; NOT used
 *                                      as a placement or a mockupId)
 *
 * `mockupId` and `placement` are DIFFERENT namespaces: a mockupId is an opaque
 * scene code (e.g. "947QAD"); a placement is a print-area name (e.g. "Front").
 * Never pass one where the other is expected.
 */

export type PdpConfig = {
  /**
   * Publishable shop id (= shop.id). Safe in the browser. Resolved server-side:
   * your `NEXT_PUBLIC_SNOWCONE_SHOP` if set, otherwise a sandbox shop the server
   * minted on boot. Always present — the example never asks you to paste one.
   */
  shop: string;
  productName: string;
  /** Catalog product code / slug. */
  productId: string;
  /** A mockup SCENE code from product.mockups[].id. */
  mockupId: string;
  /** A print-area name from product.placements[].label. */
  placement: string;
  /**
   * gvid for the chosen variant (product.options.combinations[].variantId).
   * REQUIRED when the product has a variant axis (2+ distinct variantIds);
   * omitting it makes the render hang waiting for a color blob that never comes.
   */
  variantId?: string;
  /** The catalog options block, passed verbatim so the session can fail fast. */
  options?: RenderProductOptions;
  /** Render dimensions, taken from the placement (fallback 1200). */
  width: number;
  height: number;
};

const DEFAULT_PRODUCT_ID = "BC43BE";

function firstString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function firstVariantId(options: RenderProductOptions | undefined): string | undefined {
  return options?.combinations?.find((combination) => firstString(combination.variantId))
    ?.variantId;
}

/**
 * Fetch the catalog product and resolve a valid (mockupId, placement,
 * variantId) selection from live catalog data, honoring optional env overrides.
 * Server-only (called from the server PDP) — pure catalog read, no secret.
 */
export async function loadProduct(): Promise<PdpConfig> {
  const productId = process.env.NEXT_PUBLIC_SNOWCONE_PRODUCT_ID ?? DEFAULT_PRODUCT_ID;

  // Resolve the shop (env override or freshly minted sandbox) and the catalog
  // product in parallel — neither depends on the other.
  const [shop, product] = await Promise.all([
    getDemoShopId(),
    getProduct(productId),
  ]);

  const mockupId =
    process.env.NEXT_PUBLIC_SNOWCONE_MOCKUP_ID ??
    firstString(product.mockups?.[0]?.id) ??
    "";
  const placement =
    process.env.NEXT_PUBLIC_SNOWCONE_PLACEMENT ??
    firstString(product.placements?.[0]?.label) ??
    "Front";
  const variantId =
    process.env.NEXT_PUBLIC_SNOWCONE_VARIANT_ID ?? firstVariantId(product.options);

  const placementRecord = product.placements?.find(
    (candidate) => candidate.label === placement,
  );

  return {
    shop,
    productName: product.name,
    productId,
    mockupId,
    placement,
    variantId,
    options: product.options,
    width: placementRecord?.width ?? 1200,
    height: placementRecord?.height ?? 1200,
  };
}
