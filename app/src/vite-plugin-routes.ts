import fs from "fs";
import path from "path";
import { Plugin } from "vite";

interface RouteDefinition {
  file: string;
  route: string;
}

function collectRoutes(
  dir: string,
  baseDir: string,
  parent: string,
  routes: RouteDefinition[]
) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const folderName = item.name;
      const folderPath = path.join(dir, folderName);

      // Check if there's an index file
      const indexTsx = path.join(folderPath, "index.tsx");
      const indexJsx = path.join(folderPath, "index.jsx");
      if (fs.existsSync(indexTsx) || fs.existsSync(indexJsx)) {
        const routePart = folderName.startsWith("[")
          ? `:${folderName.slice(1, -1)}`
          : folderName;
        // If parent === "/", then route becomes `/${routePart}` else `${parent}/${routePart}`
        const routePath =
          parent === "/" ? `/${routePart}` : `${parent}/${routePart}`;

        routes.push({
          file: path.relative(
            baseDir,
            fs.existsSync(indexTsx) ? indexTsx : indexJsx
          ),
          route: routePath,
        });
      }

      // Recurse deeper
      collectRoutes(
        folderPath,
        baseDir,
        parent === "/" ? `/${folderName}` : `${parent}/${folderName}`,
        routes
      );
    } else {
      const name = item.name;
      if (
        (name.endsWith(".tsx") || name.endsWith(".jsx")) &&
        !name.startsWith("_") // skip _app, _document, etc.
      ) {
        const filePath = path.join(dir, name);
        const routeName = name.replace(/\.(tsx|jsx)$/, "");

        // If it's `index.tsx` => route is parent
        // otherwise if parent is "/", route is `/${routeName}`
        // else it's `${parent}/${routeName}`
        const routePath =
          routeName === "index"
            ? parent
            : parent === "/"
              ? `/${routeName}`
              : `${parent}/${routeName}`;

        routes.push({
          file: path.relative(baseDir, filePath),
          route: routePath || "/",
        });
      }
    }
  }
}

// Build .routes/routes.json and .routes/index.d.ts for intellisense
async function generateRoutes() {
  const configPath = path.join(process.cwd(), "router.config.js");
  let pagesDir = path.join(process.cwd(), "pages");
  if (fs.existsSync(configPath)) {
    const conf = await import(pathToFileURL(configPath));
    if (conf.default?.pagesPath) {
      pagesDir = path.join(process.cwd(), conf.default.pagesPath);
    }
  }

  const routes: RouteDefinition[] = [];
  collectRoutes(pagesDir, pagesDir, "/", routes);

  const outDir = path.join(process.cwd(), ".routes");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Write routes.json
  fs.writeFileSync(
    path.join(outDir, "routes.json"),
    JSON.stringify(routes, null, 2)
  );

  // Build minimal type definitions for auto-complete
  const routeDefs = routes
    .map((r) => {
      // Turn /:param into a template-friendly example `/${param:string}`
      const typed = r.route.replace(
        /:([A-Za-z0-9]+)/g,
        (_, p1) => `(\${${p1}: string})`
      );
      return `    "${r.route}": (params?: { [key: string]: string }) => void; // e.g. router.push(\`${typed}\`)`;
    })
    .join("\n");

  const dtsContent = `declare module "virtual-routes" {
  interface RouteMap {
${routeDefs}
  }
  export const routes: RouteMap;
}
`;
  fs.writeFileSync(path.join(outDir, "index.d.ts"), dtsContent);
}

function pathToFileURL(p: string) {
  const resolved = path.resolve(p).replace(/\\/g, "/");
  return `file://${resolved}`;
}

// Vite plugin: runs generateRoutes on startup & file changes
export default function routePlugin(): Plugin {
  return {
    name: "vite-route-generator",
    apply: "serve",
    async buildStart() {
      await generateRoutes();
    },
    async handleHotUpdate({ file }) {
      if (file.includes("/pages/")) {
        await generateRoutes();
      }
    },
  };
}

export { generateRoutes };
