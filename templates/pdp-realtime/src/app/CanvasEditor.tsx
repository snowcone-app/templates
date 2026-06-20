"use client";

import { useMemo } from "react";
import {
  RealtimeEmbed,
  RealtimeCanvas,
  RealtimeMockup,
  design,
  useTextBinding,
  useRealtimeMockups,
} from "@snowcone-app/canvas/embed";
import "@snowcone-app/canvas/style.css";
import type { PdpConfig } from "@/lib/snowcone";

// A demo asset served from a public shop-storage origin. Swap for your own.
const SEED_ASSET = "https://dqMwU8Jct3.storage.snowcone.app/demo/demo-008.jpg";

/**
 * The design is the SINGLE source of truth. `<RealtimeEmbed>` seeds BOTH the
 * editor canvas and the first server render from this one object, so there's no
 * hand-maintained "seed state" to drift out of sync with the canvas. Named
 * layers (`headline`, `art`) are what `useTextBinding` / `useImageBinding`
 * resolve against. The artboard `name` is the placement — it must match the
 * catalog placement label, which is why we pass `config.placement`.
 */
function buildDesign(config: PdpConfig) {
  return design({
    name: config.placement,
    width: config.width,
    height: config.height,
  })
    .image(SEED_ASSET, {
      anchor: "center",
      name: "art",
      width: Math.round(config.width * 0.45),
    })
    .text("SNOWCONE", { anchor: "top", name: "headline", color: "#111111" });
}

/**
 * Bring-your-own control. `<RealtimeCanvas kit="embed-only">` ships no chrome —
 * YOU supply the UI. This input is bound to the `headline` layer by name; every
 * keystroke updates the layer, which auto-renders a fresh mockup. Rendered as a
 * child of `<RealtimeCanvas>`, so it lives inside the editor context the binding
 * hook needs.
 */
function PersonalizePanel() {
  const { text, setText, isConnected } = useTextBinding("headline");
  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: 10,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      <label
        htmlFor="headline-input"
        style={{ fontSize: 13, fontWeight: 600, color: "#111" }}
      >
        Headline
      </label>
      <input
        id="headline-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!isConnected}
        placeholder="Type to personalize…"
        style={{
          flex: 1,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #d4d4d8",
          fontSize: 14,
          color: "#111",
        }}
      />
    </div>
  );
}

/** A thin render-status line, driven by the shared session via the hook. */
function RenderStatus() {
  const { isRendering, error } = useRealtimeMockups();
  if (error) {
    return (
      <pre
        style={{
          whiteSpace: "pre-wrap",
          color: "#fca5a5",
          background: "#1c0a0a",
          border: "1px solid #5b1a1a",
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          margin: 0,
        }}
      >
        {error}
      </pre>
    );
  }
  return (
    <p style={{ color: "#71717a", fontSize: 13, margin: 0 }}>
      {isRendering ? "Rendering…" : "Rendered"}
    </p>
  );
}

export function CanvasEditor({ config }: { config: PdpConfig }) {
  // `design` and `product` are the embed's initial inputs — keep their identity
  // stable so the session isn't rebuilt on re-render. The same `design` object
  // seeds the canvas and the first render.
  const designState = useMemo(() => buildDesign(config), [config]);
  const product = useMemo(
    () => ({
      productId: config.productId,
      // mockupIds are catalog SCENE codes (product.mockups[].id) — NOT the
      // placement, NOT the gvid.
      mockupIds: [config.mockupId],
      // Required when the product has a variant axis; omitting it hangs.
      variantId: config.variantId,
      // Passing the catalog options + placements lets the embed FAIL FAST /
      // warn LOUDLY on a missing variantId or a wrong placement instead of
      // silently timing out or rendering a blank mockup.
      options: config.options,
      placements: [config.placement],
    }),
    [config],
  );

  return (
    <RealtimeEmbed
      shop={config.shop}
      grantUrl="/api/realtime/grant"
      product={product}
      design={designState}
    >
      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 420px)",
          gap: 24,
          alignItems: "start",
        }}
      >
        <section>
          <RealtimeCanvas maxHeight={640}>
            <PersonalizePanel />
          </RealtimeCanvas>
        </section>

        <aside style={{ display: "grid", gap: 12 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>{config.productName}</h2>
          <p style={{ color: "#71717a", lineHeight: 1.5, margin: 0 }}>
            Product <code>{config.productId}</code> · mockup{" "}
            <code>{config.mockupId}</code> · placement{" "}
            <code>{config.placement}</code>
            {config.variantId ? (
              <>
                {" "}
                · variant <code>{config.variantId}</code>
              </>
            ) : null}
          </p>

          <div
            style={{
              minHeight: 280,
              display: "grid",
              placeItems: "center",
              border: "1px solid #27272a",
              borderRadius: 12,
              background: "#fff",
              overflow: "hidden",
            }}
          >
            <RealtimeMockup
              alt="Live Snowcone mockup"
              style={{ display: "block", maxWidth: "100%", height: "auto" }}
              fallback={
                <p style={{ color: "#71717a" }}>Rendering initial mockup…</p>
              }
            />
          </div>

          <RenderStatus />
        </aside>
      </div>
    </RealtimeEmbed>
  );
}
