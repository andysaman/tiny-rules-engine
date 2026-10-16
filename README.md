# tiny-rules-engine

A small, inspectable rules engine for front-end **business logic** demos.

This is a public hiring artifact. It is meant to be read in one sitting and run locally in under a minute. It is **not** affiliated with any employer.

## Why this exists

My resume emphasizes shipping a **rules-engine package** for business logic across large web experiences, and making complex flows explainable. This repo is a stripped-down teaching version of that idea:

- Rules are uniquely named `condition` → `action` pairs; actions return a result
- Two strategies: first match, or evaluate all matches in order
- Observability (traces) is a separate module that plugs in via hooks

## Quick start

Requires Node.js 22+.

```bash
npm run demo
npm test
```

No dependencies. TypeScript runs via Node's built-in type stripping.

## What to look at

| File | Role |
|------|------|
| `src/types.ts` | Shared type contracts |
| `src/engine.ts` | `evaluateFirstMatch` and `evaluateAll` |
| `src/observability.ts` | Trace collector via evaluation hooks |
| `src/demo.ts` | Toy content-gate scenarios (age / region / parental PIN) |
| `src/engine.test.ts` | Engine unit tests |
| `src/observability.test.ts` | Observability unit tests |
| `src/functional.test.ts` | End-to-end gate scenarios |
| `AGENTS.md` | How I steer AI on this repo |

## Design notes

1. **Match → action → result** — the engine does not patch context; actions return the value.
2. **Observability is a module** — the engine stays pure; traces plug in through hooks.
3. **Stay tiny** — no framework, no persistence, no product roadmap. One idea, done well enough to discuss in an interview.

## Roadmap (one slice at a time)

- [x] README + runnable demo + tests
- [x] Stub `AGENTS.md` for how I steer AI (recruiters can read this too)
- [ ] Owner review: correct AI scaffold; expand `AGENTS.md` in my own words
- [ ] Optional: tiny XState companion example for multi-step flows
- [ ] Optional: HTML page that prints the evaluation trace in the browser

## License

MIT
