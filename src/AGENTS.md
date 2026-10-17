# `src/` domain rules

Demo gate scenarios are fictional teaching data only.

## Import graph

```
types.ts                 # shared types only; imports nothing from siblings
    ↑
engine.ts                # evaluation; imports types.ts only
observability.ts         # observers; imports types.ts only
utils/rules.ts           # rulesFor().define + uniqueness types; imports types.ts only
    ↑
demo.ts / *.test.ts      # apps & tests
```

Rules:

1. **`types.ts` is the type root.** Shared contracts (`Rule`, `EvaluateHooks`, …) are defined only here.
2. **Feature modules do not import each other.** `engine.ts`, `observability.ts`, and `utils/*` never import one another; they couple only through types + hooks.
3. **Module-local types stay local.** e.g. `Trace` / `TraceHit` in `observability.ts` until a second module needs them — then move to `types.ts`.
4. **Do not re-export shared types from feature modules.** Callers import types from `types.ts` and functions from the feature file.

## Module split

- **`types.ts`** — cross-module type contracts only (no helpers).
- **`engine.ts`** — `evaluateFirstMatch` / `evaluateAll` only.
- **`observability.ts`** — `createTraceCollector` (and future collectors).
- **`utils/rules.ts`** — `rulesFor().define` and related uniqueness helpers (safe to refactor independently).
- New cross-cutting concerns follow the same pattern: own module, import `types.ts`, consume hooks.

## Engine invariants

- Match → run `action` → return that value. No context merging, effects, or `set` patches in the engine.
- Two strategies: `evaluateFirstMatch` (one result or `undefined`) and `evaluateAll` (array of results, or a `combine`d value).
- Pass `hooks` / `combine` via a single `options` object — not positional trailing args.
- **Unique names + result types are compile-time.** Use `rulesFor<Input, Result>().define([...])` from `utils/rules.ts`. Wrong `action` returns and duplicate names fail at that call site — not later at evaluate. Do not throw from the engine for duplicates.
- **Pure rules.** `condition` / `action` take `Readonly<TInput>`; no I/O.

## Rule shape

Keep `Rule` as `name` + `condition` + `action → TResult`. Always bind types with `rulesFor<Input, Result>()` before `.define([...])` so authors cannot omit the result contract. Do not annotate the list as `Rule[]` (widens names and disables uniqueness).

## Tests and demo

| Suite | File | Scope |
|-------|------|--------|
| Engine unit | `engine.test.ts` | `evaluateFirstMatch` / `evaluateAll` only — no observability |
| Observability unit | `observability.test.ts` | `createTraceCollector` (and future collectors) |
| Rules utils unit | `utils/rules.test.ts` | `rulesFor().define` uniqueness / result typing |
| Functional | `functional.test.ts` | Engine + observability + realistic scenarios |

- Colocate unit tests next to the module they cover (`foo.ts` → `foo.test.ts`).
- Every test follows **Arrange / Act / Assert** (label the sections with comments).
- Blank line after early `return` / `continue` / `break` when more code follows in the same block (`npm run lint:style`).
- `demo.ts` stays a printable content-gate toy (age / region / parental PIN). Prefer another scenario over abstracting the demo into a library.
