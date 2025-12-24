import path from "path";
import { spawn } from "child_process";

const ROOT = path.resolve(process.cwd());
const PACKAGES = [
  { name: "@attay/client", dir: path.join(ROOT, "packages", "client") },
  { name: "@attay/server", dir: path.join(ROOT, "packages", "server") },
];

function parseArgs(argv: string[]) {
  const args = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i++;
    } else {
      args.set(key, true);
    }
  }
  return {
    dryRun: args.get("dry-run") === true,
    tag:
      typeof args.get("tag") === "string" ? String(args.get("tag")) : undefined,
    access:
      typeof args.get("access") === "string"
        ? String(args.get("access"))
        : "public",
    otp:
      typeof args.get("otp") === "string" ? String(args.get("otp")) : undefined,
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

async function main() {
  const { dryRun, tag, access, otp } = parseArgs(process.argv.slice(2));

  // 1) Ensure versions are synced
  await run("bun", ["run", "scripts/version.ts"], ROOT);

  // 2) Build both
  await run("bun", ["run", "scripts/build.ts"], ROOT);

  // 3) Publish each package
  for (const p of PACKAGES) {
    console.log(`\n==> Publishing ${p.name}`);

    const publishArgs = ["publish", "--access", access];
    if (dryRun) publishArgs.push("--dry-run");
    if (tag) publishArgs.push("--tag", tag);
    if (otp) publishArgs.push("--otp", otp);

    // Use npm for publishing (works well with registries). Run per-package.
    await run("npm", publishArgs, p.dir);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
