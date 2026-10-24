import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  compareNodeVersions,
  localPinProblems,
  normalizeNodeVersion,
  parseReleaseIndex,
  readEnginesNode,
  readPinnedVersion,
  replaceExactVersion,
  securityPinStatus,
  updatePinnedVersion,
} from "./node-pin.ts";

test("normalizeNodeVersion accepts an exact release with or without a v prefix", () => {
  // Arrange
  const plain = "24.22.1";
  const prefixed = "v24.22.1";

  // Act
  const fromPlain = normalizeNodeVersion(plain);
  const fromPrefixed = normalizeNodeVersion(prefixed);

  // Assert
  assert.equal(fromPlain, "24.22.1");
  assert.equal(fromPrefixed, "24.22.1");
});

test("normalizeNodeVersion rejects ranges and incomplete versions", () => {
  // Arrange
  const samples = [">=22", "24.22", "24.22.1.0", "node-24.22.1"];

  // Act
  const failures = samples.map((sample) => {
    try {
      normalizeNodeVersion(sample);
      return false;
    } catch {
      return true;
    }
  });

  // Assert
  assert.deepEqual(failures, [true, true, true, true]);
});

test("compareNodeVersions orders major, minor, then patch", () => {
  // Arrange
  const older = "24.22.1";
  const newer = "v24.23.0";

  // Act
  const difference = compareNodeVersions(older, newer);

  // Assert
  assert.equal(difference < 0, true);
  assert.equal(compareNodeVersions(newer, older) > 0, true);
  assert.equal(compareNodeVersions("24.22.1", "v24.22.1"), 0);
});

test("readPinnedVersion and readEnginesNode require the canonical pin", () => {
  // Arrange
  const nvmrc = "24.22.1\n";
  const packageJson = JSON.stringify({ engines: { node: "24.22.1" } });

  // Act
  const pinned = readPinnedVersion(nvmrc);
  const engines = readEnginesNode(packageJson);

  // Assert
  assert.equal(pinned, "24.22.1");
  assert.equal(engines, "24.22.1");
  assert.throws(() => readPinnedVersion("v24.22.1\n"), /exactly 24\.22\.1/);
  assert.throws(() => readEnginesNode(JSON.stringify({ engines: { node: ">=22" } })), /exact x\.y\.z pin/);
});

test("localPinProblems reports engines and the running runtime", () => {
  // Arrange
  const options = { pinned: "24.22.1", engines: "24.22.0", running: "v25.8.2" };

  // Act
  const problems = localPinProblems(options);

  // Assert
  assert.equal(problems.length, 2);
  assert.match(problems[0] ?? "", /24\.22\.0/);
  assert.match(problems[1] ?? "", /25\.8\.2/);
});

test("securityPinStatus asks for a newer security release on the same major line", () => {
  // Arrange
  const releases = parseReleaseIndex([
    { version: "v26.12.1", security: true },
    { version: "v24.23.0", security: true },
    { version: "v24.22.2", security: false },
    { version: "v24.22.1", security: true },
    { version: "not-a-version", security: true },
  ]);

  // Act
  const status = securityPinStatus("24.22.1", releases);

  // Assert
  assert.deepEqual(status, { status: "upgrade", latest: "24.23.0" });
});

test("securityPinStatus stays current when the pin is already the newest security release", () => {
  // Arrange
  const releases = parseReleaseIndex([
    { version: "v24.22.2", security: false },
    { version: "v24.22.1", security: true },
    { version: "v22.23.4", security: true },
  ]);

  // Act
  const status = securityPinStatus("24.22.1", releases);

  // Assert
  assert.deepEqual(status, { status: "current", latest: "24.22.1" });
});

test("securityPinStatus reports unknown when the major line has no security release", () => {
  // Arrange
  const releases = parseReleaseIndex([{ version: "v22.23.4", security: true }]);

  // Act
  const status = securityPinStatus("24.22.1", releases);

  // Assert
  assert.deepEqual(status, { status: "unknown" });
});

test("replaceExactVersion skips version strings that only share a prefix", () => {
  // Arrange
  const source = "pin 24.22.1. types 24.22.10 and build 1.24.22.1";

  // Act
  const replaced = replaceExactVersion(source, "24.22.1", "24.23.0");

  // Assert
  assert.equal(replaced, "pin 24.23.0. types 24.22.10 and build 1.24.22.1");
});

test("updatePinnedVersion rewrites every pin file", (t) => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "node-pin-"));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  const packageJson = {
    engines: { node: "24.22.1" },
    devDependencies: { "@types/node": "^24.22.10" },
  };

  fs.writeFileSync(path.join(root, ".nvmrc"), "24.22.1\n");
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    `${JSON.stringify({ packages: { "": { engines: { node: "24.22.1" } } } }, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(root, "README.md"), "Requires Node.js 24.22.1.\n");
  fs.writeFileSync(path.join(root, "AGENTS.md"), "Node.js 24.22.1 only.\n");

  // Act
  updatePinnedVersion(root, "24.22.1", "24.23.0");

  // Assert
  assert.equal(fs.readFileSync(path.join(root, ".nvmrc"), "utf8"), "24.23.0\n");
  assert.match(fs.readFileSync(path.join(root, "package.json"), "utf8"), /"node": "24\.23\.0"/);
  assert.match(fs.readFileSync(path.join(root, "package.json"), "utf8"), /\^24\.22\.10/);
  assert.match(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"), /"node": "24\.23\.0"/);
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "Requires Node.js 24.23.0.\n");
  assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), "Node.js 24.23.0 only.\n");
});
