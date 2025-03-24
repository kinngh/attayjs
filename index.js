import { serve } from "bun";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routes = { GET: {}, POST: {}, PUT: {}, DELETE: {}, PATCH: {} };

async function registerApiRoutes(dir, baseRoute = "/api") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await registerApiRoutes(entryPath, baseRoute + "/" + entry.name);
    } else {
      const methodName = path.basename(entry.name, ".js").toUpperCase();
      if (Object.hasOwn(routes, methodName)) {
        const mod = await import(entryPath);
        routes[methodName][baseRoute] = mod.default;
      }
    }
  }
}

await registerApiRoutes(path.join(__dirname, "pages", "api"));

/**
 * Wraps a handler with one or more middleware functions.
 * Each middleware receives the current Request and may:
 * - Return a Response object to short-circuit further processing.
 * - Return an updated Request to pass along to the next step.
 * - Return nothing (or undefined) to keep using the same Request.
 * The final argument is assumed to be the actual route handler.
 * @param {...Function} fns - middleware functions followed by the final route handler
 * @returns {Function} an async function that processes the Request
 */
export function withMiddleware(...fns) {
  return async function (request) {
    let currentRequest = request;

    for (let i = 0; i < fns.length - 1; i++) {
      const result = await fns[i](currentRequest);
      if (result instanceof Response) {
        return result;
      }
      if (result instanceof Request) {
        currentRequest = result;
      }
    }

    return fns[fns.length - 1](currentRequest);
  };
}

serve({
  port: 3000,
  /**
   * @param {Request} req
   */
  async fetch(req) {
    try {
      const { method } = req;
      const { pathname } = new URL(req.url);
      const handler = routes[method]?.[pathname];
      if (!handler) {
        return new Response("Not found", { status: 404 });
      }
      return await handler(req);
    } catch (err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log("Server listening on http://localhost:3000");
