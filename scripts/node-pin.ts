import fs from "node:fs";
import path from "node:path";

export type NodeRelease = {
  version: string;
  security: boolean;
};

export type SecurityPinStatus =
  | { status: "current"; latest: string }
  | { status: "upgrade"; latest: string }
  | { status: "unknown" };

const PIN_FILES = [
  ".nvmrc",
  "package.json",
  "package-lock.json",
  "README.md",
  "AGENTS.md",
] as const;

const EXACT_VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;

export function normalizeNodeVersion(raw: string): string {
  const match = EXACT_VERSION.exec(raw.trim());

  if (!match) throw new Error(`Not an exact Node.js version: ${raw}`);

  return `${match[1]}.${match[2]}.${match[3]}`;
}

export function compareNodeVersions(left: string, right: string): number {
  const a = normalizeNodeVersion(left).split(".").map(Number);
  const b = normalizeNodeVersion(right).split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;

    if (av !== bv) return av - bv;
  }

  return 0;
}

export function readPinnedVersion(nvmrc: string): string {
  const trimmed = nvmrc.trim();
  const normalized = normalizeNodeVersion(trimmed);

  if (trimmed !== normalized) {
    throw new Error(`.nvmrc must pin exactly ${normalized}`);
  }

  return normalized;
}

export function readEnginesNode(packageJson: string): string {
  const parsed: unknown = JSON.parse(packageJson);

  if (typeof parsed !== "object" || parsed === null || !("engines" in parsed)) {
    throw new Error("package.json engines.node is missing");
  }

  const engines = parsed.engines;

  if (typeof engines !== "object" || engines === null || !("node" in engines)) {
    throw new Error("package.json engines.node is missing");
  }

  const node = engines.node;

  if (typeof node !== "string") throw new Error("package.json engines.node is missing");

  let normalized: string;

  try {
    normalized = normalizeNodeVersion(node);
  } catch {
    throw new Error(
      `package.json engines.node must be an exact x.y.z pin. Found ${node}.`,
    );
  }

  if (node !== normalized) {
    throw new Error(`package.json engines.node must be exactly ${normalized}`);
  }

  return normalized;
}

export function localPinProblems(options: {
  pinned: string;
  engines: string;
  running: string;
}): string[] {
  const problems: string[] = [];
  const running = normalizeNodeVersion(options.running);

  if (options.engines !== options.pinned) {
    problems.push(
      `package.json engines.node is ${options.engines}. .nvmrc pins ${options.pinned}.`,
    );
  }

  if (running !== options.pinned) {
    problems.push(`This process is Node.js ${running}. .nvmrc pins ${options.pinned}.`);
  }

  return problems;
}

export function parseReleaseIndex(data: unknown): NodeRelease[] {
  if (!Array.isArray(data)) throw new Error("Node.js release index was not a list");

  const releases: NodeRelease[] = [];

  for (const entry of data) {
    if (typeof entry !== "object" || entry === null) continue;

    const version = "version" in entry ? entry.version : undefined;

    if (typeof version !== "string") continue;

    const security = "security" in entry ? entry.security : undefined;

    releases.push({ version, security: security === true });
  }

  return releases;
}

export function securityPinStatus(
  pinned: string,
  releases: readonly NodeRelease[],
): SecurityPinStatus {
  const major = Number(normalizeNodeVersion(pinned).split(".")[0]);
  let latest: string | undefined;

  for (const release of releases) {
    if (!release.security) continue;

    let normalized: string;

    try {
      normalized = normalizeNodeVersion(release.version);
    } catch {
      continue;
    }

    if (Number(normalized.split(".")[0]) !== major) continue;

    if (latest === undefined || compareNodeVersions(normalized, latest) > 0) {
      latest = normalized;
    }
  }

  if (latest === undefined) return { status: "unknown" };

  if (compareNodeVersions(latest, pinned) > 0) return { status: "upgrade", latest };

  return { status: "current", latest };
}

export function replaceExactVersion(source: string, from: string, to: string): string {
  const pattern = new RegExp(
    `(?<![0-9.])${from.replaceAll(".", "\\.")}(?![0-9])`,
    "g",
  );
  const replaced = source.replace(pattern, to);

  if (replaced === source) throw new Error(`Expected to find Node.js ${from}`);

  return replaced;
}

export function updatePinnedVersion(root: string, from: string, to: string): void {
  for (const name of PIN_FILES) {
    const full = path.join(root, name);
    const source = fs.readFileSync(full, "utf8");
    const next = name === ".nvmrc" ? `${to}\n` : replaceExactVersion(source, from, to);

    fs.writeFileSync(full, next);
  }
}
