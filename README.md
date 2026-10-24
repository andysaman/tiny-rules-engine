# tiny-rules-engine

A small, inspectable rules engine for front-end **business logic**.

## Value proposition

Front-end product logic often starts as a few `if`s and quietly becomes a maze: order is implicit, edge cases hide in nesting, tracing and navigation get copy-pasted into every branch, and the same checks cannot be reused without duplicating the maze.

**Before — nested decisions, hand-rolled tracing, navigation tangled in:**

```ts
function enterWatchPage(user: {
  age: number;
  region: string;
  hasParentalControls: boolean;
  featureFlags: Record<string, boolean>;
}) {
  const hits: string[] = [];

  if (["US", "CA", "GB"].includes(user.region)) {
    if (user.age >= 18) {
      if (user.hasParentalControls && user.featureFlags.parentalPin) {
        hits.push("pin-required");
        console.log("hits", hits);
        navigate("/gates/parental-pin");
        return;
      }

      hits.push("allowed");
      console.log("hits", hits);
      navigate("/watch");
      return;
    } else {
      hits.push("age-gate");
      console.log("hits", hits);
      navigate("/gates/age");
      return;
    }
  } else {
    hits.push("region-block");
    console.log("hits", hits);
    navigate("/gates/unavailable-region");
    return;
  }
}

// Need the same gates on checkout? Copy the whole nest — or drift forever.
function enterCheckout(user: /* same shape */) {
  /* paste resolveGate again, tweak a branch, forget a hits.push… */
}
```

**After — named rules return the path; call sites stay short:**

```ts
// Define once — each action returns where to go.
const regionBlock = {
  name: "region-block",
  condition: (user: GateInput) => !["US", "CA", "GB"].includes(user.region),
  action: () => "/gates/unavailable-region",
};

const ageGate = {
  name: "age-gate",
  condition: (user: GateInput) => user.age < 18,
  action: () => "/gates/age",
};

const parentalPin = {
  name: "parental-pin",
  condition: (user: GateInput) =>
    user.hasParentalControls && Boolean(user.featureFlags.parentalPin),
  action: () => "/gates/parental-pin",
};

// Compose per surface — same rules, different lists.
const watchRules = rulesFor<GateInput, string>().define([
  regionBlock,
  ageGate,
  parentalPin,
]);

const checkoutRules = rulesFor<GateInput, string>().define([
  regionBlock,
  parentalPin,
]);

function enterWatchPage(user: GateInput) {
  const trace = createTraceCollector<string>();
  const path = evaluateFirstMatch(watchRules, user, { hooks: trace.hooks });

  console.log("hits", trace.getTrace().hits.map((h) => h.name));
  navigate(path ?? "/watch");
}

function enterCheckout(user: GateInput) {
  const trace = createTraceCollector<string>();
  const path = evaluateFirstMatch(checkoutRules, user, { hooks: trace.hooks });

  console.log("hits", trace.getTrace().hits.map((h) => h.name));
  navigate(path ?? "/checkout");
}
```

Nested `if`s fuse decision, logging, and routing into one procedure you have to copy. Rules are data: define a check once, drop it into another list, and keep every call site to “evaluate → log hits → navigate.”

What you gain:

- **Simple call sites** — a few lines instead of a nested maze
- **Composable rules** — reuse `regionBlock` / `parentalPin` across watch and checkout
- **Readable order** — priority is list order, not brace depth
- **Inspectable without clutter** — one trace collector instead of `hits.push` in every branch



## The core is this small

The interesting part of the engine is a short loop: skip non-matches, run the first action, optionally notify observers, return. No framework, no graph, no DSL.

```ts
export function evaluateFirstMatch<TInput, TResult>(
  rules: readonly Rule<TInput, TResult>[],
  input: TInput,
  options?: EvaluateFirstMatchOptions<TResult>,
): TResult | undefined {
  for (const rule of rules) {
    if (!rule.condition(input)) continue;

    const result = rule.action(input);
    options?.hooks?.onMatch?.({ name: rule.name, result });
    return result;
  }

  return undefined;
}
```

That is the whole first-match strategy (`src/engine.ts`). `evaluateAll` is the same loop without the early `return`, plus an optional `combine`.

## Quick start

Requires Node.js 24.22.1 (Active LTS), pinned in `.nvmrc`. npm refuses other versions.

```bash
npm ci
npm run demo
npm test               # pin check, unit/functional tests, typecheck, style lint
npm run typecheck      # tsc --noEmit (also runs as part of npm test)
npm run audit:critical # fails when a critical advisory is present
```

No runtime dependencies. TypeScript runs via Node's built-in type stripping; `typescript` / `@types/node` are dev-only for the editor and `typecheck`.

## Security

Node.js 24.22.1 is pinned exactly. CI fails when `npm audit` reports a critical advisory, and when Node.js has published a newer security release on this major line. Dependabot opens security-update pull requests for npm and GitHub Actions. A weekly workflow opens a pull request that moves the pin to that security release.



## License

MIT