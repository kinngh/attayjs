import { serve } from "bun";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type RouteHandler = (req: Request) => Promise<Response> | Response;
type Middleware = (
  req: Request
) => Promise<Response | Request | void> | Response | Request | void;

type Routes = {
  [K in HttpMethod]: Record<string, RouteHandler>;
};

const routes: Routes = {
  GET: {},
  POST: {},
  PUT: {},
  DELETE: {},
  PATCH: {},
};

async function registerApiRoutes(
  dir: string,
  baseRoute = "/api"
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await registerApiRoutes(entryPath, baseRoute + "/" + entry.name);
    } else {
      const methodName = path
        .basename(entry.name)
        .replace(/\.(js|ts)$/, "")
        .toUpperCase() as HttpMethod;
      if (methodName in routes) {
        const mod = await import(entryPath);
        if (typeof mod.default === "function") {
          routes[methodName][baseRoute] = mod.default as RouteHandler;
        }
      }
    }
  }
}

await registerApiRoutes(path.join(process.cwd(), "pages", "api"));

export function withMiddleware(
  ...fns: [...Middleware[], RouteHandler]
): RouteHandler {
  return async function (request: Request): Promise<Response> {
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

    const finalResult = await fns[fns.length - 1](currentRequest);
    if (!(finalResult instanceof Response)) {
      throw new Error("Final handler must return a Response");
    }

    return finalResult;
  };
}

serve({
  port: 3000,
  async fetch(req: Request): Promise<Response> {
    try {
      const method = req.method as HttpMethod;
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
