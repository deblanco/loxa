import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // tsconfig sets jsx: "preserve" for Next, so the test runner needs its own
  // JSX transform.
  plugins: [react()],
  resolve: {
    alias: {
      "@": here("./"),
      // The pages under test use next/link and next/font only for markup, and
      // pulling the real ones in would drag the framework into a plain Node run.
      "next/link": here("./test/stubs/next-link.tsx"),
      "next/font/google": here("./test/stubs/next-font.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.tsx"],
  },
});
