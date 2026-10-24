import fs from "node:fs";
import path from "node:path";
import {
  localPinProblems,
  parseReleaseIndex,
  readEnginesNode,
  readPinnedVersion,
  securityPinStatus,
  updatePinnedVersion,
} from "./node-pin.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const INDEX_URL = "https://nodejs.org/dist/index.json";

function setGitHubOutput(name: string, value: string): void {
  const file = process.env.GITHUB_OUTPUT;

  if (!file) return;

  fs.appendFileSync(file, `${name}=${value}\n`);
}

async function fetchReleaseIndex() {
  const response = await fetch(INDEX_URL);

  if (!response.ok) {
    throw new Error(`Node.js release index returned ${response.status}`);
  }

  return parseReleaseIndex(await response.json());
}

async function main(): Promise<void> {
  const update = process.argv.includes("--update");
  const checkSecurity = update || process.argv.includes("--security");
  const pinned = readPinnedVersion(fs.readFileSync(path.join(ROOT, ".nvmrc"), "utf8"));
  const engines = readEnginesNode(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const problems = localPinProblems({
    pinned,
    engines,
    running: process.version,
  });

  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }

  if (!checkSecurity) {
    console.log(`node pin: ${pinned}`);
    return;
  }

  const status = securityPinStatus(pinned, await fetchReleaseIndex());

  if (status.status === "unknown") {
    throw new Error(`No Node.js security release was found for the ${pinned.split(".")[0]}.x line.`);
  }

  if (status.status === "current") {
    setGitHubOutput("updated", "false");
    console.log(`node pin: ${pinned} includes the latest security release on this line`);
    return;
  }

  if (!update) {
    throw new Error(
      `Node.js ${status.latest} is a newer security release on this line. .nvmrc pins ${pinned}.`,
    );
  }

  updatePinnedVersion(ROOT, pinned, status.latest);
  setGitHubOutput("updated", "true");
  setGitHubOutput("version", status.latest);
  console.log(`node pin: updated ${pinned} -> ${status.latest}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exit(1);
});
