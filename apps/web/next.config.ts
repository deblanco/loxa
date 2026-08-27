import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Dependencies are hoisted to the repo root by bun's `linker = "hoisted"`, so
  // file tracing has to start there or the standalone build ships incomplete.
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
  // The asset set is fixed and pre-sized; Workers image transformations bill per
  // transformation and are not currently cached.
  images: { unoptimized: true },
  // @loxa/shared ships raw TypeScript with no build step (by design), so Next
  // has to compile it rather than treat it as a published package.
  transpilePackages: ["@loxa/shared"],
};

export default nextConfig;

// Wires Cloudflare bindings into `next dev`.
initOpenNextCloudflareForDev();
