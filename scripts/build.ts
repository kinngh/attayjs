import { rm } from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const ROOT = path.resolve(process.cwd());
const PACKAGES = [
  { name: "@attay/client", dir: path.join(ROOT, "packages", "client") },
  { name: "@attay/server", dir: path.join(ROOT, "packages", "server") },
];

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  for (const a of argv) if (a.startsWith("--")) flags.add(a.slice(2));
  return {
    clean: flags.has("clean"),
    typecheck: flags.has("typecheck"),
  };
}

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${cmd} ${args.join(" ")} failed (code ${code ?? "?"})`)
        );
    });
  });
}

async function cleanDist(pkgDir: string) {
  const dist = path.join(pkgDir, "dist");
  await rm(dist, { recursive: true, force: true });
}

async function main() {
  const { clean, typecheck } = parseArgs(process.argv.slice(2));

  if (clean) {
    for (const p of PACKAGES) await cleanDist(p.dir);
  }

  // Optional root-wide typecheck if you add it later.
  if (typecheck) {
    await run(
      "bun",
      ["x", "tsc", "-p", "tsconfig.base.json", "--noEmit"],
      ROOT
    );
  }

  for (const p of PACKAGES) {
    console.log(`\n==> Building ${p.name}`);
    await run("bun", ["run", "build"], p.dir);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
