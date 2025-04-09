import react from "@vitejs/plugin-react";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import routePlugin from "./src/vite-plugin-routes";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), routePlugin()],
  root: dirname(fileURLToPath(import.meta.url)),
  resolve: {
    preserveSymlinks: true,
  },
});
