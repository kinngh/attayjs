import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface RouterContextValue {
  push: (url: string) => void;
  prefetch: (urls: string[]) => void;
  query: Record<string, string>;
  params: Record<string, string>;
  setParams: (params: Record<string, string>) => void;
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

export function RouterProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState(
    () => window.location.pathname
  );
  const [currentQuery, setCurrentQuery] = useState(() =>
    parseQuery(window.location.search)
  );
  const [params, setParams] = useState<Record<string, string>>({});

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
    setParams,
    currentPath,
    matchedRoute: undefined,
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
