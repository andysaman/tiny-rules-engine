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

```bash
npm ci
npm run demo
npm test
```

`npm run demo` prints the content-gate scenarios in `src/demo.ts`. Node runs those TypeScript files directly (`node src/demo.ts`).

## Design

A rule is `name`, `condition`, and `action`. Bind the list with `rulesFor<Input, Result>().define([...])` from `src/utils/rules.ts` so the result type and unique names are checked at that call site. Keep the names as string literals there; a `Rule[]` annotation widens them and the uniqueness check no longer applies. A duplicate name fails at `define`.

`condition` and `action` receive `Readonly<input>`. A match runs `action` and returns that value. The engine stays a pure loop: no context merging, patches, or I/O.

Two strategies, both in `src/engine.ts`:

- `evaluateFirstMatch` returns the first match, or `undefined`.
- `evaluateAll` runs every match and returns the results in order. Pass `combine` to fold them into one value.

`hooks` and `combine` travel in one options object.

Tracing stays outside the loop. `createTraceCollector` in `src/observability.ts` implements `onMatch` and records hits. Logging or metrics would be another module that plugs in the same way.

```
types.ts                 shared contracts only
engine.ts                evaluateFirstMatch / evaluateAll
observability.ts         createTraceCollector
utils/rules.ts           rulesFor().define
demo.ts / *.test.ts      the toy gate and the tests
```

`types.ts` is the only place shared types are defined. `engine.ts`, `observability.ts`, and `utils/rules.ts` each import that file only. Call sites import types from `types.ts` and functions from the module that owns them. A type stays in its module until a second module needs it.

## Development

Runtime dependencies: none. Tests use `node:test` and `node:assert/strict`. `typescript` and `@types/node` are dev-only, for the editor and `npm run typecheck` (`tsc --noEmit`).

Relative imports keep the `.ts` extension (`./engine.ts`). That matches Node's type stripping.

`npm test` runs, in order: the Node.js pin check, unit and functional tests, `typecheck`, then `lint:style`.

| Suite | File | Covers |
|-------|------|--------|
| Engine | `src/engine.test.ts` | `evaluateFirstMatch` / `evaluateAll` |
| Observability | `src/observability.test.ts` | `createTraceCollector` |
| Rule lists | `src/utils/rules.test.ts` | `rulesFor().define` |
| Functional | `src/functional.test.ts` | Engine, tracing, and the gate scenarios |
| Node pin | `scripts/node-pin.test.ts` | The pin checker |

Unit tests sit next to the module they cover. Each test is arranged as Arrange / Act / Assert.

`npm run lint:style` checks `src/` and `scripts/`. After `return`, `continue`, or `break`, leave a blank line when another statement follows in the same block.

## Security

Node.js 24.22.1 is pinned exactly in `.nvmrc` and `package.json` `engines`. `.npmrc` sets `engine-strict`, so npm installs only on that version. `npm run audit:critical` fails when `npm audit` reports a critical advisory. CI runs that audit, and fails when Node.js has published a newer security release on this major line. Dependabot opens security-update pull requests for npm and GitHub Actions. A weekly workflow opens a pull request that moves the pin to that security release.



## License

MIT