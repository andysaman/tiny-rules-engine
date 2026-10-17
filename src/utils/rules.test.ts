import assert from "node:assert/strict";
import { test } from "node:test";
import { rulesFor } from "./rules.ts";

type Ctx = { score: number };
type Result = "boosted" | "ready";

test("rulesFor.define accepts a unique list with explicit input and result types", () => {
  // Arrange / Act
  const rules = rulesFor<Ctx, Result>().define([
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

  // Assert
  assert.deepEqual(
    rules.map((r) => r.name),
    ["boost", "ready"],
  );
});

// Compile-time checks: the @ts-expect-error directives below must stay.
test("rulesFor.define rejects duplicate literal names at the type level", () => {
  // Arrange / Act
  // @ts-expect-error duplicate literal rule names
  const rules = rulesFor<Ctx, Result>().define([
    {
      name: "one",
      condition: () => true,
      action: () => "boosted",
    },
    {
      name: "two",
      condition: () => true,
      action: () => "ready",
    },
    {
      name: "one",
      condition: () => true,
      action: () => "boosted",
    },
  ]);

  // Assert — runtime still receives the list; uniqueness is a type concern
  assert.equal(rules.length, 3);
});

test("rulesFor.define rejects an action that returns the wrong result type", () => {
  // Arrange / Act — error is on the action at this call site
  const rules = rulesFor<Ctx, Result>().define([
    {
      name: "boost",
      condition: (ctx) => ctx.score < 10,
      action: () => "boosted",
    },
    {
      name: "ready",
      condition: (ctx) => ctx.score >= 10,
      // @ts-expect-error action must return Result, not number
      action: () => 42,
    },
  ]);

  // Assert
  assert.equal(rules.length, 2);
});
