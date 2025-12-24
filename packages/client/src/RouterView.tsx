/// <reference types="vite/client" />

import { ErrorBoundary, Router, Route, lazy } from "preact-iso";
import type { ComponentType, JSX } from "preact";

type AnyComponent = ComponentType<any>;

// Accept Vite's actual glob typing:
export type PagesGlob = Record<string, () => Promise<unknown>>;

export interface RouterViewProps {
  pages?: PagesGlob;
}

const DEFAULT_PAGES = import.meta.glob(
  "/src/pages/**/!(_)*.{tsx,jsx}"
) as PagesGlob;

function pathToIsoPattern(key: string): string {
  let routePath = key
    .replace(/^\.\.\/pages/, "")
    .replace(/^\/src\/pages/, "")
    .replace(/\.(t|j)sx$/, "");

  if (routePath.endsWith("/index")) {
    routePath = routePath.replace(/\/index$/, "") || "/";
  }

  // [...slug] -> :slug*
  routePath = routePath.replace(/\[\.\.\.([^/\]]+)\]/g, ":$1*");
  // [id] -> :id
  routePath = routePath.replace(/\[([^/\]]+)\]/g, ":$1");

  return routePath;
}

function toLazy(loader: () => Promise<unknown>) {
  // preact-iso lazy(): resolve to the actual component
  return lazy(async () => {
    const mod = await loader();
    return (mod as any)?.default ?? mod;
  }) as AnyComponent;
}

export default function RouterView({
  pages = DEFAULT_PAGES,
}: RouterViewProps): JSX.Element {
  const entries = Object.entries(pages).filter(
    ([key]) => !key.includes("/pages/api/")
  );

  const notFoundEntry = entries.find(([key]) => /\/404\.(t|j)sx$/.test(key));

  const routes = entries
    .filter(([key]) => !/\/404\.(t|j)sx$/.test(key))
    .map(([key, loader]) => {
      const path = pathToIsoPattern(key);
      const Component = toLazy(loader);
      return <Route key={key} path={path} component={Component} />;
    });

  const NotFound = notFoundEntry
    ? toLazy(notFoundEntry[1])
    : function NotFoundFallback() {
        return <p>no route found</p>;
      };

  return (
    <ErrorBoundary>
      <Router>
        {routes}
        <Route default component={NotFound as AnyComponent} />
      </Router>
    </ErrorBoundary>
  );
}
