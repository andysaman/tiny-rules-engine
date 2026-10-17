import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAll, evaluateFirstMatch } from "./engine.ts";
import { createTraceCollector } from "./observability.ts";
import { rulesFor } from "./utils/rules.ts";

type GateInput = {
  age: number;
  region: string;
  hasParentalControls: boolean;
  featureFlags: Record<string, boolean>;
};

type GateResult = {
  allowed: boolean;
  interstitial: "age-gate" | "region-block" | "pin-required";
};

function gateRules() {
  return rulesFor<GateInput, GateResult>().define([
    {
      name: "region-block",
      condition: (input) => !["US", "CA", "GB"].includes(input.region),
      action: () => ({ allowed: false, interstitial: "region-block" }),
    },
    {
      name: "age-gate",
      condition: (input) => input.age < 18,
      action: () => ({ allowed: false, interstitial: "age-gate" }),
    },
    {
      name: "parental-pin",
      condition: (input) =>
        input.hasParentalControls && Boolean(input.featureFlags.parentalPin),
      action: () => ({ allowed: false, interstitial: "pin-required" }),
    },
  ]);
}

test("content gate: unrestricted adult in a launched region needs no interstitial", () => {
  // Arrange
  const rules = gateRules();
  const input: GateInput = {
    age: 30,
    region: "US",
    hasParentalControls: false,
    featureFlags: { parentalPin: true },
  };
  const trace = createTraceCollector<GateResult>();

  // Act
  const result = evaluateFirstMatch(rules, input, { hooks: trace.hooks });

  // Assert
  assert.equal(result, undefined);
  assert.deepEqual(trace.getTrace().hits, []);
});

test("content gate: underage viewer hits age-gate first", () => {
  // Arrange
  const rules = gateRules();
  const input: GateInput = {
    age: 15,
    region: "US",
    hasParentalControls: false,
    featureFlags: { parentalPin: true },
  };
  const trace = createTraceCollector<GateResult>();

  // Act
  const result = evaluateFirstMatch(rules, input, { hooks: trace.hooks });

  // Assert
  assert.deepEqual(result, { allowed: false, interstitial: "age-gate" });
  assert.deepEqual(
    trace.getTrace().hits.map((h) => h.name),
    ["age-gate"],
  );
});

test("content gate: unlaunched region blocks before other gates", () => {
  // Arrange
  const rules = gateRules();
  const input: GateInput = {
    age: 40,
    region: "JP",
    hasParentalControls: false,
    featureFlags: { parentalPin: true },
  };
  const trace = createTraceCollector<GateResult>();

  // Act
  const result = evaluateFirstMatch(rules, input, { hooks: trace.hooks });

  // Assert
  assert.deepEqual(result, { allowed: false, interstitial: "region-block" });
  assert.deepEqual(
    trace.getTrace().hits.map((h) => h.name),
    ["region-block"],
  );
});

test("content gate: parental controls require a PIN", () => {
  // Arrange
  const rules = gateRules();
  const input: GateInput = {
    age: 35,
    region: "CA",
    hasParentalControls: true,
    featureFlags: { parentalPin: true },
  };
  const trace = createTraceCollector<GateResult>();

  // Act
  const result = evaluateFirstMatch(rules, input, { hooks: trace.hooks });

  // Assert
  assert.deepEqual(result, { allowed: false, interstitial: "pin-required" });
  assert.deepEqual(
    trace.getTrace().hits.map((h) => h.name),
    ["parental-pin"],
  );
});

test("evaluateAll with combine and trace records every gate that applies", () => {
  // Arrange
  const rules = gateRules();
  const input: GateInput = {
    age: 15,
    region: "US",
    hasParentalControls: true,
    featureFlags: { parentalPin: true },
  };
  const trace = createTraceCollector<GateResult>();
  const combine = (results: readonly GateResult[]) => ({
    allowed: results.every((r) => r.allowed),
    interstitials: results.map((r) => r.interstitial),
  });

  // Act
  const combined = evaluateAll(rules, input, {
    hooks: trace.hooks,
    combine,
  });

  // Assert
  assert.deepEqual(combined, {
    allowed: false,
    interstitials: ["age-gate", "pin-required"],
  });
  assert.deepEqual(
    trace.getTrace().hits.map((h) => h.name),
    ["age-gate", "parental-pin"],
  );
});
