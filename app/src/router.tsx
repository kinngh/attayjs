import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface RouteMapEntry {
  file: string;
  route: string;
}

// If using the vite-plugin-routes approach, this JSON is auto-generated.
// If not found, fallback to an empty array so the router still works.
let routeMap: RouteMapEntry[] = [];
try {
  routeMap = await import("../.routes/routes.json", {
    assert: { type: "json" },
  }).then((mod) => mod.default);
} catch {
  // no-op
}

interface RouterContextValue {
  push: (url: string) => void;
  prefetch: (urls: string[]) => void;
  query: Record<string, string>;
  params: Record<string, string>;
  currentPath: string;
  matchedRoute?: string;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function parseQuery(search: string) {
  const params: Record<string, string> = {};
  if (search.startsWith("?")) {
    new URLSearchParams(search).forEach((value, key) => {
      params[key] = value;
    });
  }
  return params;
}

function matchRoute(pathname: string) {
  // Find the first route whose pattern matches pathname
  // Convert /:param => /([^/]+)
  for (const r of routeMap) {
    const pattern = r.route.replace(/\/:([A-Za-z0-9]+)/g, "/([^/]+)");
    const regex = new RegExp(`^${pattern}/?$`);
    const match = pathname.match(regex);
    if (match) {
      const paramNames = (r.route.match(/:([A-Za-z0-9]+)/g) || []).map((x) =>
        x.slice(1)
      );
      const values = match.slice(1);
      const params: Record<string, string> = {};
      paramNames.forEach((p, i) => {
        params[p] = values[i];
      });
      return { matched: r.route, params };
    }
  }
  // If no match, maybe return a 404 route or fallback to "/"
  return { matched: "/", params: {} };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState(
    () => window.location.pathname
  );
  const [currentQuery, setCurrentQuery] = useState(() =>
    parseQuery(window.location.search)
  );

  const { matched, params } = matchRoute(currentPath);

  const routerValue: RouterContextValue = {
    push: (url: string) => {
      window.history.pushState({}, "", url);
      setCurrentPath(window.location.pathname);
      setCurrentQuery(parseQuery(window.location.search));
    },
    prefetch: (urls: string[]) => {
      // stub
      console.log("Prefetching", urls);
    },
    query: currentQuery,
    params,
    currentPath,
    matchedRoute: matched,
  };

  useEffect(() => {
    const onPop = () => {
      setCurrentPath(window.location.pathname);
      setCurrentQuery(parseQuery(window.location.search));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <RouterContext.Provider value={routerValue}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouter must be used inside <RouterProvider>");
  }
  return ctx;
}
