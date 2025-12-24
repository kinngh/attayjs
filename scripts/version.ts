import { readFile, writeFile } from "fs/promises";
import path from "path";

type Semver = {
  major: number;
  minor: number;
  patch: number;
  pre?: string;
  raw: string;
};

const ROOT = path.resolve(process.cwd());
const CLIENT_PKG = path.join(ROOT, "packages", "client", "package.json");
const SERVER_PKG = path.join(ROOT, "packages", "server", "package.json");
const ROOT_PKG = path.join(ROOT, "package.json");

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
  return args;
}

function parseSemver(v: string): Semver {
  const raw = v.trim();
  const [core, pre] = raw.split("-", 2);
  const parts = core.split(".");
  if (parts.length !== 3) throw new Error(`Invalid version: ${raw}`);
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  const patch = Number(parts[2]);
  if (![major, minor, patch].every((n) => Number.isInteger(n) && n >= 0)) {
    throw new Error(`Invalid version: ${raw}`);
  }
  return { major, minor, patch, pre: pre || undefined, raw };
}

function semverToString(s: Semver): string {
  const core = `${s.major}.${s.minor}.${s.patch}`;
  return s.pre ? `${core}-${s.pre}` : core;
}

function compareSemver(a: Semver, b: Semver): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  // Pre-releases are lower precedence than the associated normal version.
  if (!a.pre && b.pre) return 1;
  if (a.pre && !b.pre) return -1;
  if (a.pre && b.pre) return a.pre.localeCompare(b.pre);
  return 0;
}

function bump(ver: Semver, kind: "major" | "minor" | "patch"): Semver {
  if (kind === "major")
    return { major: ver.major + 1, minor: 0, patch: 0, raw: "" };
  if (kind === "minor")
    return { major: ver.major, minor: ver.minor + 1, patch: 0, raw: "" };
  return { major: ver.major, minor: ver.minor, patch: ver.patch + 1, raw: "" };
}

async function readJson<T = any>(file: string): Promise<T> {
  const txt = await readFile(file, "utf8");
  return JSON.parse(txt) as T;
}

async function writeJson(file: string, obj: unknown) {
  const txt = JSON.stringify(obj, null, 2) + "\n";
  await writeFile(file, txt, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const client = await readJson<any>(CLIENT_PKG);
  const server = await readJson<any>(SERVER_PKG);
  const root = await readJson<any>(ROOT_PKG);

  if (!client?.version || !server?.version) {
    throw new Error("Both packages must have a version field.");
  }

  const clientV = parseSemver(String(client.version));
  const serverV = parseSemver(String(server.version));

  let target: Semver;

  const set = args.get("set");
  const bumpKind = args.get("bump");

  if (typeof set === "string") {
    target = parseSemver(set);
  } else if (typeof bumpKind === "string") {
    if (bumpKind !== "major" && bumpKind !== "minor" && bumpKind !== "patch") {
      throw new Error("--bump must be one of: major, minor, patch");
    }
    // Bump the higher of the two versions (in case they drifted).
    const higher = compareSemver(clientV, serverV) >= 0 ? clientV : serverV;
    target = bump(higher, bumpKind);
  } else {
    // Default: sync to the higher version (so we never unintentionally go backwards).
    target = compareSemver(clientV, serverV) >= 0 ? clientV : serverV;
  }

  const targetStr = semverToString(target);

  const changed: string[] = [];

  if (String(client.version) !== targetStr) {
    client.version = targetStr;
    changed.push(`packages/client -> ${targetStr}`);
    await writeJson(CLIENT_PKG, client);
  }

  if (String(server.version) !== targetStr) {
    server.version = targetStr;
    changed.push(`packages/server -> ${targetStr}`);
    await writeJson(SERVER_PKG, server);
  }

  if (root?.version && String(root.version) !== targetStr) {
    // Keep root aligned (helps with releases/tags), even though it's private.
    root.version = targetStr;
    changed.push(`root -> ${targetStr}`);
    await writeJson(ROOT_PKG, root);
  }

  if (changed.length === 0) {
    console.log(`Versions already in sync: ${targetStr}`);
    return;
  }

  console.log("Updated versions:");
  for (const line of changed) console.log("-", line);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
