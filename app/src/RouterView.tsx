import React, { useEffect, useState } from "react";
import { useRouter } from "./router";

// Vite's dynamic import for all .tsx or .jsx in ../pages
const pageImports = import.meta.glob("../pages/**/*.{tsx,jsx}");

export function RouterView() {
  const { matchedRoute } = useRouter();
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  // Re-import routeMap if you like; or pass it from the router
  // for the file -> route mapping. Here we do a fresh import to keep it simple.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: routeMap } = await import("../.routes/routes.json", {
        assert: { type: "json" },
      });

      // find which file is associated with matchedRoute
      const found = routeMap.find((r: any) => r.route === matchedRoute);
      if (!found) {
        // e.g. no route => Not Found
        if (!cancelled) setComponent(() => () => <div>Not Found</div>);
        return;
      }

      // found.file might be "page2.tsx" => build relative path
      const importPath = `../pages/${found.file}`;

      // see if that path is in import.meta.glob
      const loader = pageImports[importPath];
      if (!loader) {
        if (!cancelled) setComponent(() => () => <div>Not Found</div>);
        return;
      }

      // dynamically import the page
      const mod = await loader();
      if (!cancelled) {
        setComponent(() => mod.default || null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchedRoute]);

  if (!Component) {
    return <div>404</div>;
  }

  return <Component />;
}
