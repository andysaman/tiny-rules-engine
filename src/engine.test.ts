import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAll, evaluateFirstMatch } from "./engine.ts";
import { rulesFor } from "./utils/rules.ts";

type Ctx = { score: number };

test("evaluateFirstMatch returns the first matching action result", () => {
  // Arrange
  const rules = rulesFor<Ctx, string>().define([
    {
      name: "boost",
      condition: (ctx) => ctx.score < 10,
      action: () => "boosted",
    },
    {
      name: "ready",
      condition: (ctx) => ctx.score >= 10,
      action: () => "ready",
    },
  ]);
  const input = { score: 3 };

  // Act
  const result = evaluateFirstMatch(rules, input);

  // Assert
  assert.equal(result, "boosted");
});

test("evaluateFirstMatch returns undefined when nothing matches", () => {
  // Arrange
  const rules = rulesFor<Ctx, string>().define([
    {
      name: "never",
      condition: () => false,
      action: () => "nope",
    },
  ]);
  const input = { score: 1 };

  // Act
  const result = evaluateFirstMatch(rules, input);

  // Assert
  assert.equal(result, undefined);
});

test("evaluateAll returns every matching action result in order", () => {
  // Arrange
  const rules = rulesFor<Ctx, string>().define([
    {
      name: "low",
      condition: (ctx) => ctx.score < 10,
      action: () => "low",
    },
    {
      name: "positive",
      condition: (ctx) => ctx.score > 0,
      action: () => "positive",
    },
  ]);
  const input = { score: 3 };

  // Act
  const results = evaluateAll(rules, input);

  // Assert
  assert.deepEqual(results, ["low", "positive"]);
});

test("evaluateAll skips rules that do not match", () => {
  // Arrange
  const rules = rulesFor<Ctx, string>().define([
    {
      name: "boost",
      condition: (ctx) => ctx.score < 10,
      action: () => "boosted",
    },
    {
      name: "ready",
      condition: (ctx) => ctx.score >= 10,
      action: () => "ready",
    },
  ]);
  const input = { score: 12 };

  // Act
  const results = evaluateAll(rules, input);

  // Assert
  assert.deepEqual(results, ["ready"]);
});

test("evaluateAll combine folds matched results into one value", () => {
  // Arrange
  const rules = rulesFor<Ctx, number>().define([
    {
      name: "base",
      condition: () => true,
      action: () => 2,
    },
    {
      name: "bonus",
      condition: (ctx) => ctx.score > 0,
      action: () => 3,
    },
  ]);
  const input = { score: 5 };
  const combine = (results: readonly number[]) =>
    results.reduce((sum, n) => sum + n, 0);

  // Act
  const total = evaluateAll(rules, input, { combine });

  // Assert
  assert.equal(total, 5);
});
