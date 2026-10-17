/**
 * Zero-dep style check: early exits (`return` / `continue` / `break`) must be
 * followed by a blank line when another statement follows in the same block.
 *
 * Skips blank-before-`}` (end of block). Not a full parser — good enough for
 * this tiny repo without ESLint.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");

/** Complete single-line exits only — skips multi-line `return {` / `return fn(`. */
const EARLY_EXIT =
  /^\s*(?:return\b[^;]*|continue\b[^;]*|break\b[^;]*);\s*(?:\/\/.*)?$/;
const CLOSING_BRACE = /^\s*\}/;
const BLANK = /^\s*$/;
const LINE_COMMENT = /^\s*\/\//;

type Finding = { file: string; line: number; text: string };

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsFiles(full));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

function nextSignificantLine(
  lines: string[],
  afterIndex: number,
): { index: number; text: string } | undefined {
  for (let i = afterIndex + 1; i < lines.length; i++) {
    const text = lines[i] ?? "";
    if (BLANK.test(text) || LINE_COMMENT.test(text)) continue;
    return { index: i, text };
  }
  return undefined;
}

function checkFile(file: string): Finding[] {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!EARLY_EXIT.test(line)) continue;

    const next = nextSignificantLine(lines, i);
    if (!next) continue;
    if (CLOSING_BRACE.test(next.text)) continue;

    const gap = lines.slice(i + 1, next.index);
    const hasBlank = gap.some((l) => BLANK.test(l ?? ""));
    if (hasBlank) continue;

    findings.push({
      file: path.relative(ROOT, file),
      line: i + 1,
      text: line.trim(),
    });
  }

  return findings;
}

const findings = walkTsFiles(SRC).flatMap(checkFile);

if (findings.length === 0) {
  console.log("early-return spacing: ok");
  process.exit(0);
}

console.error("early-return spacing: missing blank line after early exit:\n");
for (const finding of findings) {
  console.error(`  ${finding.file}:${finding.line}  ${finding.text}`);
}
console.error(
  "\nAdd a blank line below each early return/continue/break when more code follows in the same block.",
);
process.exit(1);
