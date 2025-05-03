/// <reference types="vite/client" />
import React, { useEffect, useState } from "react";
import { useRouter } from "./router";

// Vite's dynamic import for all .tsx or .jsx in ../pages, excluding /pages/api
const pageImports = import.meta.glob("../pages/**/!(_)*.{tsx,jsx}");

function normalizePath(path: string) {
  // Remove trailing slash except for root
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function pathToRoutePattern(key: string) {
  // Remove ../pages and extension
  let routePath = key.replace(/^\.\.\/pages/, "").replace(/\.(t|j)sx$/, "");
  // index file means root of folder
  if (routePath.endsWith("/index")) {
    routePath = routePath.replace(/\/index$/, "") || "/";
  }
  return routePath;
}

function buildRouteRegex(routePattern: string) {
  // Convert /[shop] to /([^/]+) and collect param names
  const paramNames: string[] = [];
  const regexStr = routePattern.replace(/\[([^/\]]+)\]/g, (_, param) => {
    paramNames.push(param);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

export function RouterView() {
  const { currentPath, setParams } = useRouter();
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Exclude /pages/api
      const entries = Object.entries(pageImports).filter(
        ([key]) => !key.includes("/pages/api/")
      );

      let foundEntry: [string, any] | undefined;
      let foundParams: Record<string, string> = {};

      // Try to match static and dynamic routes
      for (const [key, loader] of entries) {
        const routePattern = pathToRoutePattern(key);
        const { regex, paramNames } = buildRouteRegex(routePattern);
        const match = normalizePath(currentPath).match(regex);
        if (match) {
          foundEntry = [key, loader];
          foundParams = {};
          paramNames.forEach((name, i) => {
            foundParams[name] = match[i + 1];
          });
          break;
        }
      }

      // If not found, try 404 page
      if (!foundEntry) {
        foundEntry = entries.find(([key]) => /\/404\.(t|j)sx$/.test(key));
        foundParams = {};
      }

      // Set params in router context
      setParams(foundParams);

      if (foundEntry) {
        const loader = foundEntry[1] as () => Promise<any>;
        const mod = await loader();
        if (!cancelled) {
          setComponent(() => mod.default || null);
        }
      } else {
        if (!cancelled) {
          setComponent(() => () => <p>no route found</p>);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentPath, setParams]);

  if (!Component) {
    return <div>Loading...</div>;
  }

  return <Component />;
}
