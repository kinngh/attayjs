# Attay (ਅਤੈ / and)

Attay is intentionally personal.

It exists because I got tired of bending code around other people’s opinions. Instead, Attay codifies a workflow that already works well and makes it reusable.

Attay is meant to sit **next to your code**, not above it. It’s _`and`_, not `instead of`.

## What Attay Is

Attay is a small, opinionated toolkit built around:

- **Bun** on the server
- **Preact** on the client
- Filesystem-driven routing
- Minimal configuration
- Explicit control over runtime behavior

It favors:

- Composition over magic
- Plain platform primitives over wrappers
- Code you can read in one sitting

## What Attay Is Not

- It is not a "universal" framework
- It is not designed to please every use case
- It does not attempt to abstract away the platform
- It does not follow whatever is popular this year

---

## Server

The server side of Attay is a **route calculator** for Bun.

You define routes using a filesystem structure. Attay converts that structure into a `routes` object that Bun understands. You still own:

- `Bun.serve`
- request handling
- server lifecycle

Attay simply removes the boring glue.

```js
import attayRoutes from "@attayjs/server";

const autoRoutes = await attayRoutes({ dir: "./api", prefix: "/pre" });
const server = Bun.serve({
  routes: {
    ...autoRoutes,
  },
});
```

You can mix calculated routes and manual routes freely.

### Route Prefix

Attay supports an optional `prefix` option that is prepended to **every calculated API route**.

This is useful when you want to mount your API under a specific base path without changing your filesystem structure.

```js
await attayRoutes({ dir: "./api" });
```

```
api/GET.ts        -> /
api/users/GET.ts -> /users
```

```js
await attayRoutes({ dir: "./api", prefix: "/pre" });
```

```
api/GET.ts        -> /pre/
api/users/GET.ts -> /pre/users
```

The prefix:

- Defaults to empty (`""`)
- Is normalized automatically (leading slash added, trailing slash removed)
- Applies only to API routes (client routes are not prefixed)

### Middleware

Attay provides a small middleware helper for the server: `withMiddleware`.

Middleware exists to share logic across routes without inventing a new request lifecycle. It is deliberately minimal.

```js
import { withMiddleware } from "@attayjs/server";
import logMethodMiddleware from "@/middleware/logMethodMiddleware";

/**
 * @param {Request} request
 */
async function handler(request) {
  return new Response(
    JSON.stringify({ message: "Hello from GET /api/example" }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export default withMiddleware(logMethodMiddleware, handler);
```

Each middleware function may:

- Return a `Response` to stop execution
- Return a new `Request` to continue with a modified request
- Return nothing to pass the request through unchanged

The final handler **must** return a `Response`.

---

## Client

The client side of Attay provides a file-based router for **Preact**, built on `preact-iso`.

Pages are discovered using Vite’s `import.meta.glob`, lazy-loaded, and mapped to routes using simple conventions.

```jsx
import { render } from "preact";
import { LocationProvider } from "preact-iso";
import RouterView from "@attayjs/client";

render(
  <LocationProvider>
    <RouterView />
  </LocationProvider>,
  document.getElementById("app")!
);
```

By default, pages live in `src/pages`, but you can fully control discovery by passing your own glob map.

#### Custom pages directory

If you don’t want to use `src/pages`, you can pass your own Vite glob map to `RouterView`.

```jsx
import { render } from "preact";
import { LocationProvider } from "preact-iso";
import RouterView from "@attayjs/client";

const pages = import.meta.glob("/src/features/blog/pages/**/!(_)*.{tsx,jsx}");

render(
  <LocationProvider>
    <RouterView pages={pages} />
  </LocationProvider>,
  document.getElementById("app")!
);
```

This keeps page discovery fully static and bundler-friendly, while letting you organize your app however you want.

### useRouter()

`useRouter()` is a small convenience hook built on top of `preact-iso`.

It exposes the current routing state and a simple navigation helper without hiding how routing actually works.

```js
import { useRouter } from "@attayjs/client";

export default function UserPage() {
  const { params, query, push } = useRouter();

  return (
    <div>
      <p>User ID: {params.id}</p>
      <button onClick={() => push("/?from=user")}>Go home</button>
    </div>
  );
}
```

What it gives you:

- `params` — dynamic route parameters
- `query` — parsed query string values
- `push(url, replace?)` — programmatic navigation
- `currentPath` and `url` for introspection
