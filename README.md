# tiny-rules-engine

A small, inspectable rules engine for front-end **business logic** demos.

This is a public hiring artifact. It is meant to be read in one sitting and run locally in under a minute. It is **not** affiliated with any employer.

## Why this exists

My resume emphasizes shipping a **rules-engine package** for business logic across large web experiences, and making complex flows explainable. This repo is a stripped-down teaching version of that idea:

- Rules are ordered, named, and descriptive
- Evaluation returns a **trace** of which rules fired
- Context updates are plain data (easy to test)

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
| `src/engine.ts` | The engine: `evaluateRules` |
| `src/demo.ts` | Toy content-gate scenarios (age / region / parental PIN) |
| `src/engine.test.ts` | Two focused tests for ordering and skipping |
| `AGENTS.md` | How I steer AI on this repo (draft — expanding soon) |

## Design notes

1. **Order matters** — later rules see earlier effects (same as many production gate / interstitial systems).
2. **Trace first** — `hits` and `messages` make decisions reviewable in demos and tests.
3. **Stay tiny** — no framework, no persistence, no product roadmap. One idea, done well enough to discuss in an interview.

## Roadmap (one slice at a time)

- [x] README + runnable demo + tests
- [x] Stub `AGENTS.md` for how I steer AI (recruiters can read this too)
- [ ] Owner review: correct AI scaffold; expand `AGENTS.md` in my own words
- [ ] Optional: tiny XState companion example for multi-step flows
- [ ] Optional: HTML page that prints the evaluation trace in the browser

## License

MIT
