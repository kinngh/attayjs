# Attay/Client

Attay’s client utilities are a small, Vite-first helper layer for building file-based routing with **Preact** and **preact-iso**.

It provides:

- **`RouterView`** — a file-based router view that auto-registers pages from a Vite `import.meta.glob` map.
- **`useRouter`** — a tiny routing hook backed by `preact-iso` that exposes navigation + URL state.

---

## Setup

### 1) Install dependencies

- `preact`
- `preact-iso`

> Attay intentionally keeps its install footprint small. `preact` and `preact-iso` are treated as peer dependencies and should be installed by the consuming app.

### 2) Wrap your app with `LocationProvider`

`RouterView` uses `preact-iso` routing primitives, which require a `LocationProvider` high up in your tree.

```jsx
import { render } from "preact";
import { LocationProvider } from "preact-iso";
import RouterView from "attay/client";

export function App() {
  return (
    <LocationProvider>
      <RouterView />
    </LocationProvider>
  );
}

render(<App />, document.getElementById("app")!);
```

That’s the minimum setup.

---

## RouterView

### Import

You can import `RouterView` as the default export:

```js
import RouterView from "attay/client";
```

Or as a named export:

```js
import { RouterView } from "attay/client";
```

### What it does

`RouterView` renders a `preact-iso` `<Router>` containing one `<Route>` per page module discovered via Vite’s `import.meta.glob()`.

- Pages are **lazy-loaded** (code-split) via `preact-iso`’s `lazy()`.
- Route paths are derived from filenames using a small set of conventions (documented below).
- If a `404.tsx` / `404.jsx` page exists, it is used as the default route.

### Default pages folder

By default, `RouterView` loads pages from:

```
/src/pages/**/!(_)*.{tsx,jsx}
```

That means:

- Your pages should live under **`src/pages`**
- Files starting with `_` are ignored (for example: `_layout.tsx`, `_utils.ts`, `_meta.ts`, etc.)
- Both `.tsx` and `.jsx` pages are supported

Minimal example:

```
src/
  pages/
    index.tsx
    about.tsx
    users/
      [id].tsx
    404.tsx
```

### Overriding the pages folder

Because Vite’s `import.meta.glob()` must be **statically analyzable at build time**, you cannot pass a runtime string like `"./pages"` and expect Attay to discover files.

Instead, you pass the **glob map** itself:

```tsx
import RouterView from "attay/client";

const pages = import.meta.glob("/src/features/blog/pages/**/!(_)*.{tsx,jsx}");

export function App() {
  return (
    <LocationProvider>
      <RouterView pages={pages} />
    </LocationProvider>
  );
}
```

This keeps things simple and requires no Vite plugins.

### Props

#### `pages?: PagesGlob`

A Vite `import.meta.glob` map.

```ts
import type { PagesGlob } from "attay/client";

// PagesGlob is effectively:
// Record<string, () => Promise<{ default: ComponentType<any> } & Record<string, unknown>>>
```

If omitted, `RouterView` uses the default glob:

```ts
import.meta.glob("/src/pages/**/!(_)*.{tsx,jsx}");
```

### File-to-route conventions

Attay converts page filenames into `preact-iso` route patterns.

#### Index routes

- `src/pages/index.tsx` → `/`
- `src/pages/blog/index.tsx` → `/blog`

#### Static routes

- `src/pages/about.tsx` → `/about`
- `src/pages/blog/post.tsx` → `/blog/post`

#### Dynamic segments

Use bracket syntax to declare params:

- `src/pages/users/[id].tsx` → `/users/:id`

Inside the page component, you can read the param with `useRouter()` (see below).

#### Catch-all segments

Use `[...param]` for a splat / catch-all:

- `src/pages/docs/[...slug].tsx` → `/docs/:slug*`

This is useful for nested docs, wikis, or “any depth” routes.

#### 404 / not found

If a `404.tsx` (or `404.jsx`) exists anywhere under the pages glob, it is used as the default route.

Example:

- `src/pages/404.tsx` → default route

If no `404` page exists, Attay renders a small fallback.

#### Ignored pages

Attay ignores:

- Anything under `/pages/api/` (by path match)
- Files starting with `_` (via the glob pattern `!(_)*`)

This lets you keep internal helpers near pages without creating routes.

### Example page modules

A basic page:

```tsx
export default function Home() {
  return <h1>Home</h1>;
}
```

A param page:

```tsx
import { useRouter } from "attay/client";

export default function UserPage() {
  const { params } = useRouter();

  return <h1>User: {params.id}</h1>;
}
```

A catch-all page:

```tsx
import { useRouter } from "attay/client";

export default function DocsPage() {
  const { params } = useRouter();

  // For `/docs/a/b/c`, `params.slug` is typically a string representing the matched segment(s)
  // (exact format depends on the router implementation).
  return <pre>{JSON.stringify(params, null, 2)}</pre>;
}
```

---

## useRouter

### Import

```ts
import { useRouter } from "attay/client";
```

### What it returns

`useRouter()` is a small wrapper around `preact-iso`’s `useLocation()` and `useRoute()`.

It returns a `RouterLike` object:

```ts
export interface RouterLike {
  /** Navigate to a URL.
   *
   * - `replace = false` (default): pushes a new history entry
   * - `replace = true`: replaces the current history entry
   */
  push: (url: string, replace?: boolean) => void;

  /** Parsed querystring as key/value pairs (e.g. `?q=hello&page=2`). */
  query: Record<string, string>;

  /** Route params derived from dynamic segments (e.g. `/users/:id`). */
  params: Record<string, string>;

  /** Current pathname (e.g. `/users/123`). */
  currentPath: string;

  /** Full URL/path representation as exposed by the underlying router. */
  url: string;
}
```

### Common patterns

#### Navigate on click

```tsx
import { useRouter } from "attay/client";

export function Nav() {
  const router = useRouter();

  return (
    <nav>
      <button onClick={() => router.push("/")}>Home</button>
      <button onClick={() => router.push("/about")}>About</button>
      <button onClick={() => router.push("/users/42")}>User 42</button>
    </nav>
  );
}
```

#### Replace instead of push

Use `replace: true` to avoid creating a new browser history entry:

```tsx
import { useRouter } from "attay/client";

export function LoginRedirect() {
  const { push } = useRouter();

  function finishLogin() {
    // replace history so the back button doesn't return to the login screen
    push("/dashboard", true);
  }

  return <button onClick={finishLogin}>Finish Login</button>;
}
```

#### Read querystring

```tsx
import { useRouter } from "attay/client";

export default function SearchPage() {
  const { query } = useRouter();

  return (
    <div>
      <h1>Search</h1>
      <p>Query: {query.q ?? "(none)"}</p>
      <p>Page: {query.page ?? "1"}</p>
    </div>
  );
}
```

#### Read params

```tsx
import { useRouter } from "attay/client";

export default function PostPage() {
  const { params } = useRouter();

  return <h1>Post ID: {params.id}</h1>;
}
```

---

## TypeScript notes

### Vite types

If you are using `import.meta.glob` in your app or relying on Attay’s defaults, ensure your TypeScript environment includes Vite’s client types.

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vite/client", "node"]
  }
}
```

And install the dev-time packages:

```bash
bun add -d vite @types/node
```

> These are **development-only** dependencies for type-checking. They do not affect the runtime bundle size of your app.

---

## Limitations and expectations

- `RouterView` is designed for **Vite-style bundling**. Its page discovery relies on `import.meta.glob()`.
- The `pages` prop must be a **glob map**, not a runtime path string.
- The default pages location assumes a conventional Vite project layout: **`/src/pages`**.

If you want full control (or a different router shape), pass a custom `pages` glob map and keep the rest of the system the same.
