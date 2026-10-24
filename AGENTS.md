# Agent notes

Public demo: a tiny ordered rules engine. Read `README.md` for intent; keep changes sitting-sized.

## Don't

- Add dependencies, a bundler, a framework, or persistence
- Invent employer names, metrics, or proprietary details
- Grow this into a product roadmap or multi-package workspace
- Bake traces, logging, or metrics into the engine core
- Define shared types inside a feature module (`engine.ts`, `observability.ts`, …)

## Quirks

- **Node.js 24.22.1 only.** Pinned in `.nvmrc` and `package.json` `engines` (`.npmrc` sets `engine-strict`). Type stripping is stable, so scripts run with `node file.ts`. `npm test` refuses a different runtime. CI fails when this pin is behind a Node.js security release; a weekly workflow opens a pull request to move it. No `tsc` build.
- **`.ts` import specifiers** are required (`./engine.ts`). This is Node strip-types, not a bundler workflow.
- **Zero runtime deps.** Tests use `node:test` + `node:assert/strict`. Dev-only: `@types/node` + `typescript` for editor/`npm run typecheck` (`tsconfig.json`). No `tsc` emit/build. `npm test` runs the Node pin check, unit tests, `typecheck`, then `lint:style`.
- **Cross-cutting concerns are modules.** Observability, logging, and similar concerns get their own file and plug in via hooks — do not fold them into `engine.ts`.
- **Shared types live in `src/types.ts`.** If a type is imported by more than one module, define it there — never re-home it inside a feature module.
- **Rule lists via `rulesFor<Input, Result>().define([...])`.** Lives in `src/utils/rules.ts`; locks result types and unique names at the definition site. Do not add runtime uniqueness throws in the engine.
- **Prefer an options object** when a function would otherwise take multiple optional/confusable trailing args (hooks, combine, etc.).
- **Blank line after early exits.** After `return` / `continue` / `break`, leave an empty line when more code follows in the same block (not required before `}`). Enforced by `npm run lint:style` (zero-dep script).

## Shipping a change

When the user asks to land work on `main`, open a pull request and squash-merge it. The subject is one sentence ending in a period. The body says why. GitHub appends `(#N)`.

1. Branch from an up-to-date `main`. Use a short kebab-case name.
2. Commit on that branch. Run `npm test` when the local Node version matches `.nvmrc`.
3. `git push -u origin HEAD`
4. `gh pr create` with this body:

```markdown
## Summary
- …

## Test plan
- [ ] CI check `test` passes
```

5. `gh pr checks <number> --watch`
6. After `test` passes, `gh pr merge <number> --squash`. `--subject` is the commit subject, including the period. `--body` is the commit’s why, so the test plan stays on the pull request.
7. `git checkout main && git pull`

The check `test` runs `npm test`, `npm run audit:critical`, and `node scripts/check-node-pin.ts --security`.

## Progressive disclosure

| Path | When |
|------|------|
| `src/AGENTS.md` | Editing `src/` (import graph, engine, observability) |
| `README.md` | Scope, design notes, roadmap |
