import type { ReactNode } from "react";

export const metadata = {
  title: "Snowcone — Live-mockup PDP (pro-studio)",
  description:
    "Embedded SnowconeCanvas whose edits stream through RenderSession.renderState into a live mockup URL (ADR-0079).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#0b0b0f",
          color: "#e7e7ea",
        }}
      >
        {children}
      </body>
    </html>
  );
}
