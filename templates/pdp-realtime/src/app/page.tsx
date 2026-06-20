import { loadProduct } from "@/lib/snowcone";
import { Editor } from "./Editor";

// Render on each request, never at build time. The page does a live catalog
// fetch (getProduct), which has no network in CI — force-dynamic keeps
// `next build` from trying to prerender (and thus fetch) it.
export const dynamic = "force-dynamic";

/**
 * Server PDP. Fetches live catalog data via `getProduct` (in `loadProduct`),
 * resolves a valid mockup / placement / variant, then hands the config to the
 * client editor. The canvas is rendered client-only (see ./Editor).
 */
export default async function Page() {
  const config = await loadProduct();

  // The shop is always resolved server-side (env override or a sandbox shop the
  // server minted on boot), so the only thing that can be missing is catalog
  // data — a transient catalog hiccup, not developer setup.
  const missing = [
    config.mockupId ? null : "catalog mockup id",
    config.placement ? null : "catalog placement",
  ].filter(Boolean);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
        Snowcone live-mockup PDP
      </h1>
      <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>
        A <code>&lt;RealtimeEmbed&gt;</code> from{" "}
        <code>@snowcone-app/canvas/embed</code>: edit the headline in the field
        over the canvas (a bring-your-own control bound to the layer by name),
        and a fresh mockup lands in the preview on the right. One{" "}
        <code>design()</code> seeds both the canvas and the render; no
        per-placement pixel upload — the server fetches your assets (ADR-0079).
      </p>

      {missing.length > 0 ? (
        <div
          style={{
            border: "1px solid #5b4500",
            background: "#1c1605",
            borderRadius: 8,
            padding: 16,
            marginTop: 16,
          }}
        >
          <strong>Catalog unavailable.</strong> Couldn&apos;t resolve{" "}
          {missing.join(", ")} from the live catalog. This is usually transient —
          reload in a moment.
        </div>
      ) : (
        <Editor config={config} />
      )}
    </main>
  );
}
