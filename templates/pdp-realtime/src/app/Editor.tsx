"use client";

import dynamic from "next/dynamic";
import type { PdpConfig } from "@/lib/snowcone";

/**
 * `ssr:false` dynamic wrapper. SnowconeCanvas is browser-only and reads
 * `window` at module load, so it cannot be server-rendered. Loading
 * CanvasEditor through `next/dynamic` with `ssr:false` keeps it client-only.
 * (`ssr:false` is only allowed inside a Client Component, hence "use client".)
 */
const CanvasEditor = dynamic(
  () => import("./CanvasEditor").then((m) => m.CanvasEditor),
  {
    ssr: false,
    loading: () => (
      <p style={{ color: "#71717a", marginTop: 24 }}>Loading editor…</p>
    ),
  },
);

export function Editor({ config }: { config: PdpConfig }) {
  return <CanvasEditor config={config} />;
}
