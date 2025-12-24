/// <reference types="vite/client" />
import { ErrorBoundary, Router, Route, lazy } from "preact-iso";
import type { ComponentType, JSX } from "preact";

type AnyComponent = ComponentType<any>;

type PageModule = { default: AnyComponent } & Record<string, unknown>;

type Loader = () => Promise<PageModule>;

export type PagesGlob = Record<string, Loader>;

export interface RouterViewProps {
  pages?: PagesGlob;
}

const DEFAULT_PAGES = import.meta.glob(
  "/src/pages/**/!(_)*.{tsx,jsx}",
) as PagesGlob;

function pathToIsoPattern(key: string): string {
  let routePath = key.replace(/^\.\.\/pages/, "").replace(/\.(t|j)sx$/, "");

  if (routePath.endsWith("/index")) {
    routePath = routePath.replace(/\/index$/, "") || "/";
  }

  routePath = routePath.replace(/\[\.\.\.([^/\]]+)\]/g, ":$1*");
  routePath = routePath.replace(/\[([^/\]]+)\]/g, ":$1");

  return routePath;
}

function toLazyModule(
  loader: Loader,
): () => Promise<{ default: AnyComponent }> {
  return async () => {
    const mod = await loader();
    return { default: mod.default };
  };
}

function RouterView({ pages = DEFAULT_PAGES }: RouterViewProps): JSX.Element {
  const entries = Object.entries(pages).filter(
    ([key]) => !key.includes("/pages/api/"),
  );

  const notFoundEntry = entries.find(([key]) => /\/404\.(t|j)sx$/.test(key));

  const routes = entries
    .filter(([key]) => !/\/404\.(t|j)sx$/.test(key))
    .map(([key, loader]) => {
      const path = pathToIsoPattern(key);
      const Component = lazy(toLazyModule(loader));
      return <Route key={key} path={path} component={Component} />;
    });

  const NotFound = notFoundEntry
    ? lazy(toLazyModule(notFoundEntry[1]))
    : function NotFoundFallback() {
        return <p>no route found</p>;
      };

  return (
    <ErrorBoundary>
      <Router>
        {routes}
        <Route default component={NotFound} />
      </Router>
    </ErrorBoundary>
  );
}

export default RouterView;
