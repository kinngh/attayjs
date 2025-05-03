import react from "@vitejs/plugin-react";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: dirname(fileURLToPath(import.meta.url)),
  resolve: {
    preserveSymlinks: true,
  },
});
