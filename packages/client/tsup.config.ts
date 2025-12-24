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
  // Keep peer deps external so consumers provide them.
  external: ["preact", "preact-iso"],
});
