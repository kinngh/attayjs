import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  target: "es2022",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  // Bun + Node built-ins should not be bundled.
  external: ["bun", "node:fs", "node:fs/promises", "node:path", "node:url"],
});
