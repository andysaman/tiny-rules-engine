import { evaluateFirstMatch } from "./engine.ts";
import { createTraceCollector } from "./observability.ts";
import { defineRules } from "./types.ts";

/**
 * Toy "gate" rules for a content interstitial.
 * Fictional product context — not affiliated with any employer.
 */
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

const rules = defineRules<GateInput, GateResult>()([
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

const scenarios: GateInput[] = [
  {
    age: 30,
    region: "US",
    hasParentalControls: false,
    featureFlags: { parentalPin: true },
  },
  {
    age: 15,
    region: "US",
    hasParentalControls: false,
    featureFlags: { parentalPin: true },
  },
  {
    age: 40,
    region: "JP",
    hasParentalControls: false,
    featureFlags: { parentalPin: true },
  },
  {
    age: 35,
    region: "CA",
    hasParentalControls: true,
    featureFlags: { parentalPin: true },
  },
];

for (const [index, input] of scenarios.entries()) {
  const trace = createTraceCollector<GateResult>();
  const result = evaluateFirstMatch(rules, input, { hooks: trace.hooks });
  console.log(`\nScenario ${index + 1}`);
  console.log("  input: ", summarizeInput(input));
  console.log(
    "  hits:  ",
    trace.getTrace().hits.map((h) => h.name).join(", ") || "(none)",
  );
  console.log("  result:", result ? summarizeResult(result) : "(no match)");
}

function summarizeInput(input: GateInput): string {
  return `region=${input.region} age=${input.age} parental=${input.hasParentalControls}`;
}

function summarizeResult(result: GateResult): string {
  return `allowed=${result.allowed} interstitial=${result.interstitial}`;
}
