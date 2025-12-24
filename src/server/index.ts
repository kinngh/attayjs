import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type RouteHandler = (req: Request) => Response | Promise<Response>;

export type MiddlewareResult = Response | Request | void;
export type Middleware = (
  req: Request,
) => MiddlewareResult | Promise<MiddlewareResult>;

export type MethodHandlers = Partial<Record<HttpMethod, RouteHandler>>;

// Bun's `routes` accepts values like Response, Bun.file(), handler functions, or per-method handlers.
// We keep this intentionally broad so Attay can return what Bun expects.
export type BunRouteValue =
  | Response
  | ReturnType<typeof Bun.file>
  | RouteHandler
  | MethodHandlers;
export type BunRoutes = Record<string, BunRouteValue>;

export interface AttayRoutesOptions {
  /** Directory that contains your API route files. Defaults to `${process.cwd()}/api`. */
  dir?: string;

  /**
   * Prefix prepended to every calculated API route.
   *
   * Examples:
   *  - "" (default) => "/users"
   *  - "/pre" => "/pre/users"
   */
  prefix?: string;

  /** Vite build output directory (usually `./client/dist`). If provided, Attay serves assets + SPA fallback. */
  client?: string;
}

/**
 * Wrap a final route handler with one or more middleware functions.
 *
 * Each middleware can:
 *  - return a Response to end the chain
 *  - return a Request to continue with a modified request
 *  - return void to pass the current request through
 */
export function withMiddleware(
  ...fns: [...Middleware[], RouteHandler]
): RouteHandler {
  return async (req: Request) => {
    let current: Request = req;

    for (let i = 0; i < fns.length - 1; i++) {
      const r = await fns[i](current);
      if (r instanceof Response) return r;
      if (r instanceof Request) current = r;
    }

    const final = await fns[fns.length - 1](current);
    if (!(final instanceof Response)) {
      throw new Error("Final handler must return Response");
    }
    return final;
  };
}

/** Very small mime map for common frontend assets. */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function isHttpMethod(x: string): x is HttpMethod {
  return (
    x === "GET" ||
    x === "POST" ||
    x === "PUT" ||
    x === "DELETE" ||
    x === "PATCH"
  );
}

function normalizeRouteSegment(seg: string): string {
  // [id] -> :id
  const m1 = seg.match(/^\[([^\]/]+)\]$/);
  if (m1) return `:${m1[1]}`;

  // [...slug] -> * (Bun wildcard)
  const m2 = seg.match(/^\[\.\.\.([^\]/]+)\]$/);
  if (m2) return "*";

  return seg;
}

function toRoutePath(routeBase: string): string {
  // routeBase comes in like "" or "/users/[id]"
  const clean = routeBase.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!clean) return "/";

  const parts = clean.split("/").filter(Boolean).map(normalizeRouteSegment);

  return "/" + parts.join("/");
}

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix) return "";
  const trimmed = prefix.trim();
  if (!trimmed) return "";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
}

function joinPrefixed(prefix: string, routePath: string): string {
  if (!prefix) return routePath;
  if (routePath === "/") return prefix + "/";
  return prefix + routePath;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath);
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Create a Bun `routes` table by scanning an API directory and (optionally) wiring up
 * Vite client static assets + SPA fallback.
 */
export default async function attayRoutes(
  options: AttayRoutesOptions = {},
): Promise<BunRoutes> {
  const routes: BunRoutes = {};
  const prefix = normalizePrefix(options.prefix);

  const dir = options.dir
    ? path.isAbsolute(options.dir)
      ? options.dir
      : path.join(process.cwd(), options.dir)
    : path.join(process.cwd(), "api");

  const clientDir = options.client
    ? path.isAbsolute(options.client)
      ? options.client
      : path.join(process.cwd(), options.client)
    : null;

  async function registerApi(dirPath: string, routeBase = ""): Promise<void> {
    let entries: Array<import("fs").Dirent>;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      // dir may not exist; that's ok
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await registerApi(entryPath, routeBase + "/" + entry.name);
        continue;
      }

      if (!/\.(ts|js)$/.test(entry.name)) continue;
      if (entry.name.startsWith("_")) continue;

      const name = path.basename(entry.name).replace(/\.(ts|js)$/, "");
      const upper = name.toUpperCase();
      if (!isHttpMethod(upper)) continue;

      const mod = await import(pathToFileURL(entryPath).href);
      const handler = mod?.default;
      if (typeof handler !== "function") continue;

      const routePath = joinPrefixed(prefix, toRoutePath(routeBase));

      const existing = routes[routePath];
      if (
        existing &&
        typeof existing === "object" &&
        !(existing instanceof Response)
      ) {
        const asMethods = existing as MethodHandlers;
        if (
          "GET" in asMethods ||
          "POST" in asMethods ||
          "PUT" in asMethods ||
          "DELETE" in asMethods ||
          "PATCH" in asMethods
        ) {
          asMethods[upper] = handler as RouteHandler;
          routes[routePath] = asMethods;
          continue;
        }
      }

      routes[routePath] = { [upper]: handler as RouteHandler };
    }
  }

  await registerApi(dir);

  if (clientDir) {
    const indexHtmlPath = path.join(clientDir, "index.html");

    const serveClient: RouteHandler = async (req: Request) => {
      const url = new URL(req.url);
      const pathname = url.pathname;
      const method = req.method.toUpperCase();

      if (method !== "GET" && method !== "HEAD") {
        return new Response("Not found", { status: 404 });
      }

      const safePath = pathname.replace(/^\/+/, "");
      const filePath =
        safePath === "" ? indexHtmlPath : path.join(clientDir, safePath);

      if (await fileExists(filePath)) {
        const file = Bun.file(filePath);
        return new Response(file, {
          headers: {
            "Content-Type": contentTypeFor(filePath),
          },
        });
      }

      const indexFile = Bun.file(indexHtmlPath);
      return new Response(indexFile, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    };

    routes["/*"] = serveClient;
  }

  return routes;
}

export const attayRoutesAsync = attayRoutes;
