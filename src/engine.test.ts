import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateRules, type Rule } from "./engine.ts";

type Ctx = { score: number; label: string };

const rules: Rule<Ctx>[] = [
  {
    id: "boost",
    description: "Boost low scores",
    when: (ctx) => ctx.score < 10,
    then: () => ({ set: { score: 10 }, messages: ["boosted"] }),
  },
  {
    id: "label",
    description: "Label high scores",
    when: (ctx) => ctx.score >= 10,
    then: () => ({ set: { label: "ready" } }),
  },
];

test("evaluateRules applies matching rules in order with a trace", () => {
  const result = evaluateRules(rules, { score: 3, label: "pending" });
  assert.equal(result.context.score, 10);
  assert.equal(result.context.label, "ready");
  assert.deepEqual(
    result.hits.map((h) => h.id),
    ["boost", "label"],
  );
  assert.deepEqual(result.messages, ["boosted"]);
});

test("evaluateRules skips rules that do not match", () => {
  const result = evaluateRules(rules, { score: 12, label: "pending" });
  assert.equal(result.context.score, 12);
  assert.equal(result.context.label, "ready");
  assert.deepEqual(
    result.hits.map((h) => h.id),
    ["label"],
  );
});
