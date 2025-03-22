import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routes = { GET: {}, POST: {}, PUT: {}, DELETE: {}, PATCH: {} };

async function registerApiRoutes(dir, baseRoute = "/api") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await registerApiRoutes(entryPath, baseRoute + "/" + entry.name);
    } else {
      const methodName = path.basename(entry.name, ".js").toUpperCase();
      if (Object.hasOwn(routes, methodName)) {
        const mod = await import(entryPath);
        routes[methodName][baseRoute] = mod.default;
      }
    }
  }
}

await registerApiRoutes(path.join(__dirname, "pages", "api"));

createServer((req, res) => {
  // Collect the raw data first:
  let rawData = [];
  req.on("data", (chunk) => rawData.push(chunk));
  req.on("end", async () => {
    try {
      const combinedBody = Buffer.concat(rawData);

      const { method } = req;
      const { pathname } = new URL(req.url, "http://" + req.headers.host);
      const handler = routes[method]?.[pathname];
      if (!handler) {
        res.writeHead(404);
        return res.end("Not found");
      }

      // Include the body in the Request constructor:
      const nodeRequest = new Request("http://" + req.headers.host + req.url, {
        method,
        headers: req.headers,
        body: combinedBody,
      });

      const response = await handler(nodeRequest);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  });
}).listen(3000, () => {
  console.log("Server listening on http://localhost:3000");
});
