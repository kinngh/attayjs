import path from "node:path";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type RouteHandler = (req: Request) => Response | Promise<Response>;

export type MiddlewareResult = Response | Request | void;
export type Middleware = (
  req: Request
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

/**
 * Create a Bun `routes` table by scanning an API directory and (optionally) wiring up
 * Vite client static assets + SPA fallback.
 */
export default async function attayRoutes(
  options: AttayRoutesOptions = {}
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

  // Use Bun.Glob for native performance and to avoid node:fs
  const glob = new Bun.Glob("**/*.{ts,js}");

  for await (const relativePath of glob.scan(dir)) {
    // 1. Filter: No underscore segments (e.g. "_utils/helper.ts")
    // Bun.Glob uses '/' as separator in scan results.
    const parts = relativePath.split("/");
    if (parts.some((p) => p.startsWith("_"))) continue;

    // 2. Filter: Valid HTTP method filename
    const filename = parts[parts.length - 1];
    const name = filename.replace(/\.(ts|js)$/, "");
    const upper = name.toUpperCase();
    if (!isHttpMethod(upper)) continue;

    // 3. Import
    const absolutePath = path.join(dir, relativePath);
    const mod = await import(absolutePath);
    const handler = mod?.default;
    if (typeof handler !== "function") continue;

    // 4. Calculate Route
    // Remove filename from path to get the route structure
    // e.g. "users/[id]/GET.ts" -> "users/[id]"
    const routeSegments = parts.slice(0, -1);
    const routeBase = routeSegments.join("/");

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

      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }

      const indexFile = Bun.file(indexHtmlPath);
      return new Response(indexFile);
    };

    routes["/*"] = serveClient;
  }

  return routes;
}
