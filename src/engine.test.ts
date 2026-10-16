import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAll, evaluateFirstMatch } from "./engine.ts";
import { defineRules } from "./types.ts";

type Ctx = { score: number };

test("evaluateFirstMatch returns the first matching action result", () => {
  // Arrange
  const rules = defineRules<Ctx, string>()([
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
  const rules = defineRules<Ctx, string>()([
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
  const rules = defineRules<Ctx, string>()([
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
  const rules = defineRules<Ctx, string>()([
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
  const rules = defineRules<Ctx, number>()([
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

// Compile-time uniqueness: the @ts-expect-error below must stay.
test("defineRules documents duplicate-name rejection at the type level", () => {
  // Arrange / Act — duplicate literal names must fail typechecking
  // @ts-expect-error duplicate literal rule names
  const rules = defineRules<Ctx, string>()([
    {
      name: "same",
      condition: () => true,
      action: () => "a",
    },
    {
      name: "same",
      condition: () => true,
      action: () => "b",
    },
  ]);

  // Assert — runtime still receives the list; uniqueness is a type concern
  assert.equal(rules.length, 2);
});
