# `src/` domain rules

Demo gate scenarios are fictional teaching data only.

## Import graph

```
types.ts              # shared types only; imports nothing from siblings
    ↑
engine.ts             # evaluation functions; imports types.ts only
observability.ts      # observers/collectors; imports types.ts only
    ↑
demo.ts / *.test.ts   # apps & tests; import functions from modules, types from types.ts
```

Rules:

1. **`types.ts` is the type root.** Shared contracts (`Rule`, `EvaluateHooks`, …) are defined only here.
2. **Feature modules do not import each other.** `engine.ts` and `observability.ts` never import one another; they couple only through types + hooks.
3. **Module-local types stay local.** e.g. `Trace` / `TraceHit` in `observability.ts` until a second module needs them — then move to `types.ts`.
4. **Do not re-export shared types from feature modules.** Callers import types from `types.ts` and functions from the feature file.

## Module split

- **`types.ts`** — cross-module type contracts + `defineRules`.
- **`engine.ts`** — `evaluateFirstMatch` / `evaluateAll` only.
- **`observability.ts`** — `createTraceCollector` (and future collectors).
- New cross-cutting concerns follow the same pattern: own module, import `types.ts`, consume hooks.

## Engine invariants

- Match → run `action` → return that value. No context merging, effects, or `set` patches in the engine.
- Two strategies: `evaluateFirstMatch` (one result or `undefined`) and `evaluateAll` (array of results, or a `combine`d value).
- Pass `hooks` / `combine` via a single `options` object — not positional trailing args.
- **Unique names are compile-time.** Use `defineRules<Input, Result>()([...])`. Do not throw from the engine for duplicates.
- **Pure rules.** `condition` / `action` take `Readonly<TInput>`; no I/O.

## Rule shape

Keep `Rule` as `name` + `condition` + `action → TResult`. Prefer `defineRules<Input, Result>()([...])` over a bare `Rule[]` annotation.

## Tests and demo

| Suite | File | Scope |
|-------|------|--------|
| Engine unit | `engine.test.ts` | `evaluateFirstMatch` / `evaluateAll` only — no observability |
| Observability unit | `observability.test.ts` | `createTraceCollector` (and future collectors) |
| Functional | `functional.test.ts` | Engine + observability + realistic scenarios |

- Colocate unit tests next to the module they cover (`foo.ts` → `foo.test.ts`).
- Every test follows **Arrange / Act / Assert** (label the sections with comments).
- `demo.ts` stays a printable content-gate toy (age / region / parental PIN). Prefer another scenario over abstracting the demo into a library.
