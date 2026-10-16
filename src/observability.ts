/**
 * Cross-cutting observability for rule evaluation.
 *
 * Keep this separate from the engine: traces, logging, and metrics plug in via
 * hooks rather than living inside evaluation.
 */

import type { EvaluateHooks } from "./types.ts";

/** Local to this module — not shared across modules. */
type TraceHit<TResult = unknown> = {
  name: string;
  result: TResult;
};

type Trace<TResult = unknown> = {
  hits: TraceHit<TResult>[];
};

/** Collect matched rule names and action results during evaluation. */
export function createTraceCollector<TResult = unknown>(): {
  hooks: EvaluateHooks<TResult>;
  getTrace: () => Trace<TResult>;
} {
  const hits: TraceHit<TResult>[] = [];

  return {
    hooks: {
      onMatch(event) {
        hits.push({ name: event.name, result: event.result });
      },
    },
    getTrace() {
      return { hits: [...hits] };
    },
  };
}
