import { evaluateRules, type Rule } from "./engine.ts";

/**
 * Toy "gate" rules for a content interstitial.
 * Fictional product context — not affiliated with any employer.
 */
type GateContext = {
  age: number;
  region: string;
  hasParentalControls: boolean;
  featureFlags: Record<string, boolean>;
  allowed: boolean;
  interstitial: "none" | "age-gate" | "region-block" | "pin-required";
};

const rules: Rule<GateContext>[] = [
  {
    id: "region-block",
    description: "Block regions that are not launched yet",
    when: (ctx) => !["US", "CA", "GB"].includes(ctx.region),
    then: () => ({
      set: { allowed: false, interstitial: "region-block" },
      messages: ["Region is not available"],
    }),
  },
  {
    id: "age-gate",
    description: "Show an age gate for viewers under 18",
    when: (ctx) => ctx.allowed && ctx.age < 18,
    then: () => ({
      set: { interstitial: "age-gate" },
      messages: ["Age gate required"],
    }),
  },
  {
    id: "parental-pin",
    description: "Require a PIN when parental controls are on",
    when: (ctx) =>
      ctx.allowed &&
      ctx.hasParentalControls &&
      Boolean(ctx.featureFlags.parentalPin),
    then: () => ({
      set: { interstitial: "pin-required" },
      messages: ["Parental PIN required"],
    }),
  },
];

const scenarios: GateContext[] = [
  {
    age: 30,
    region: "US",
    hasParentalControls: false,
    featureFlags: { parentalPin: true },
    allowed: true,
    interstitial: "none",
  },
  {
    age: 15,
    region: "US",
    hasParentalControls: false,
    featureFlags: { parentalPin: true },
    allowed: true,
    interstitial: "none",
  },
  {
    age: 40,
    region: "JP",
    hasParentalControls: false,
    featureFlags: { parentalPin: true },
    allowed: true,
    interstitial: "none",
  },
  {
    age: 35,
    region: "CA",
    hasParentalControls: true,
    featureFlags: { parentalPin: true },
    allowed: true,
    interstitial: "none",
  },
];

for (const [index, input] of scenarios.entries()) {
  const result = evaluateRules(rules, input);
  console.log(`\nScenario ${index + 1}`);
  console.log("  input: ", summarize(input));
  console.log(
    "  hits:  ",
    result.hits.map((h) => h.id).join(", ") || "(none)",
  );
  console.log("  result:", summarize(result.context));
  if (result.messages.length) {
    console.log("  notes: ", result.messages.join("; "));
  }
}

function summarize(ctx: GateContext): string {
  return `region=${ctx.region} age=${ctx.age} allowed=${ctx.allowed} interstitial=${ctx.interstitial}`;
}
