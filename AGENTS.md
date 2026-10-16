# Agent notes

Public hiring demo: a tiny ordered rules engine. Read `README.md` for intent; keep changes sitting-sized.

## Don't

- Add dependencies, a bundler, a framework, or persistence
- Invent employer names, metrics, or proprietary details
- Grow this into a product roadmap or multi-package workspace
- Bake traces, logging, or metrics into the engine core
- Define shared types inside a feature module (`engine.ts`, `observability.ts`, …)

## Quirks

- **Node 22+ only.** Run via `node --experimental-strip-types` (see `package.json` scripts). No `tsc` build.
- **`.ts` import specifiers** are required (`./engine.ts`). This is Node strip-types, not a bundler workflow.
- **Zero deps.** Tests use `node:test` + `node:assert/strict`.
- **Cross-cutting concerns are modules.** Observability, logging, and similar concerns get their own file and plug in via hooks — do not fold them into `engine.ts`.
- **Shared types live in `src/types.ts`.** If a type is imported by more than one module, define it there — never re-home it inside a feature module.
- **Unique rule names via `defineRules`.** Compile-time check on literal names; do not add runtime uniqueness throws in the engine.
- **Prefer an options object** when a function would otherwise take multiple optional/confusable trailing args (hooks, combine, etc.).

## Progressive disclosure

| Path | When |
|------|------|
| `src/AGENTS.md` | Editing `src/` (import graph, engine, observability) |
| `README.md` | Scope, design notes, roadmap |
