import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the file-tracing root to this example. It's an isolated app (NOT a
  // monorepo workspace member — see README "Why this isn't in the workspace"),
  // so Next must not walk up into the monorepo when tracing output files.
  outputFileTracingRoot: projectRoot,
  // @snowcone-app/* ship as source (TS / untranspiled JSX with Tailwind
  // @source directives), so Next must transpile them in this consumer app.
  transpilePackages: ["@snowcone-app/canvas", "@snowcone-app/sdk", "@snowcone-app/ui"],
};

export default nextConfig;
