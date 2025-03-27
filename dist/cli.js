#!/usr/bin/env bun
// @bun

// src/index.ts
var { serve } = globalThis.Bun;
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __dirname2 = path.dirname(fileURLToPath(import.meta.url));
var routes = {
  GET: {},
  POST: {},
  PUT: {},
  DELETE: {},
  PATCH: {},
};
async function registerApiRoutes(dir, baseRoute = "/api") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await registerApiRoutes(entryPath, baseRoute + "/" + entry.name);
    } else {
      const methodName = path
        .basename(entry.name)
        .replace(/\.(js|ts)$/, "")
        .toUpperCase();
      if (methodName in routes) {
        const mod = await import(entryPath);
        if (typeof mod.default === "function") {
          routes[methodName][baseRoute] = mod.default;
        }
      }
    }
  }
}
async function dev() {
  await registerApiRoutes(path.join(__dirname2, "pages", "api"));
  serve({
    port: 3000,
    async fetch(req) {
      try {
        const method = req.method;
        const { pathname } = new URL(req.url);
        const handler = routes[method]?.[pathname];
        if (!handler) return new Response("Not found", { status: 404 });
        return await handler(req);
      } catch (err) {
        console.error(err);
        return new Response("Internal Server Error", { status: 500 });
      }
    },
  });
  console.log("Server listening on http://localhost:3000");
}

// src/cli.ts
async function main() {
  const subcommand = process.argv[2];
  if (subcommand === "dev") {
    await dev();
  } else {
    console.log("Usage: attay dev");
  }
}
main();
