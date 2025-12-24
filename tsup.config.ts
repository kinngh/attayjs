import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "client/index": "src/client/index.ts",
    "server/index": "src/server/index.ts",
  },
  format: ["esm"],
  target: "es2022",
  splitting: true,
  sourcemap: true,
  clean: true,
  dts: true,
  external: ["preact", "preact-iso"],
});
