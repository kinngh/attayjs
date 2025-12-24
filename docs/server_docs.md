# Attay Server

Attay’s server utilities are a **route calculator** for Bun.

They are designed to:

- Generate Bun-native `routes` objects from a filesystem-based API directory
- Optionally serve a built Vite client (static assets + SPA fallback)
- Stay completely out of your server lifecycle (you still own `Bun.serve`)

Attay does **not** replace Bun’s router — it **produces input for it**.

---

## Installation

```bash
bun add attay
```

You must already be using **Bun**. No polyfills or adapters are provided.

---

## Basic Usage

```ts
import attayRoutes from "attay/server";

const server = Bun.serve({
  routes: {
    ...(await attayRoutes({ dir: "./api" })),
    // ...(await attayRoutes({ dir: "./api", prefix: "/api" }))
  },

  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at ${server.url}`);
```

Key points:

- `attayRoutes()` is **async** (filesystem + dynamic imports)
- The returned value is a **plain object** compatible with `Bun.serve({ routes })`
- You can freely spread it and add your own routes

---

## Serving a Vite Client

If you provide a `client` directory, Attay will:

1. Serve real files from that directory (JS, CSS, images, etc.)
2. Fall back to `index.html` for unmatched `GET`/`HEAD` requests (SPA routing)

```ts
import attayRoutes from "attay/server";

const server = Bun.serve({
  routes: {
    ...(await attayRoutes({
      dir: "./api",
      client: "./client/dist",
    })),
  },
});
```

Behavior notes:

- Static serving is **only** for the provided client directory
- Non-`GET`/`HEAD` requests that don’t match API routes return `404`
- Attay does not attempt to be a general-purpose file server

---

## Options

```ts
interface AttayRoutesOptions {
  dir?: string;
  prefix?: string;
  client?: string;
}
```

### `dir`

- Directory containing API route files
- Default: `process.cwd() + "/api"`
- Can be relative or absolute

### `prefix`

A URL prefix that is prepended to **every calculated API route**.

- Default: `""` (no prefix)
- The prefix is normalized automatically
- Applies **only** to API routes, not to client static or SPA fallback routes

Examples:

```ts
await attayRoutes({ dir: "./api" });
```

```
api/GET.ts        -> /
api/users/GET.ts -> /users
```

```ts
await attayRoutes({ dir: "./api", prefix: "/pre" });
```

```
api/GET.ts        -> /pre/
api/users/GET.ts -> /pre/users
```

### `client`

- Directory containing a built Vite app (must include `index.html`)
- If omitted, **no static or SPA routes are added**

---

## API Route Conventions

Attay maps files to Bun routes using a simple filesystem convention.

### Folder structure

```
api/
  users/
    GET.ts
    POST.ts
    [id]/
      GET.ts
  health/
    GET.ts
```

### Resulting routes

| File                    | Route            |
| ----------------------- | ---------------- |
| `api/users/GET.ts`      | `GET /users`     |
| `api/users/POST.ts`     | `POST /users`    |
| `api/users/[id]/GET.ts` | `GET /users/:id` |
| `api/health/GET.ts`     | `GET /health`    |

### Dynamic segments

- `[id]` → `:id`
- `[...slug]` → `*` (Bun wildcard)

Example:

```
api/docs/[...slug]/GET.ts
```

Becomes:

```
GET /docs/*
```

### Ignored files

Attay ignores:

- Files not ending in `.ts` or `.js`
- Files starting with `_`
- Files not named after an HTTP method

---

## Route Handlers

Each route file must default-export a handler function:

```ts
export default async function handler(req: Request) {
  return new Response("Hello from Attay");
}
```

The handler signature matches Bun’s expectations:

```ts
(req: Request) => Response | Promise<Response>;
```

---

## withMiddleware

Attay provides a small middleware composer to help reuse logic across routes.

### Import

```ts
import { withMiddleware } from "attay/server";
```

### Usage

```ts
const auth = async (req: Request) => {
  if (!req.headers.get("authorization")) {
    return new Response("Unauthorized", { status: 401 });
  }
};

export default withMiddleware(auth, async (req) => {
  return Response.json({ ok: true });
});
```

### Middleware behavior

Each middleware can:

- Return a `Response` → stops execution immediately
- Return a `Request` → replaces the request passed to the next step
- Return nothing → passes the current request through

The **final handler must return a `Response`**.

Middleware is executed in the order provided.

---

## Manual Routes

Because `attayRoutes()` returns a plain object, you can freely mix in your own routes:

```ts
const server = Bun.serve({
  routes: {
    ...(await attayRoutes({ dir: "./api" })),

    "/health": () => new Response("ok"),

    "/admin": {
      GET: () => new Response("admin"),
    },
  },
});
```

Spread order determines precedence.

---

## Design Philosophy

- Attay does **not** abstract Bun’s router
- Attay does **not** own your server lifecycle
- Attay prefers **calculation over configuration**
- If you can do it directly in Bun, Attay stays out of the way

Attay exists to remove boring glue code — nothing more.
