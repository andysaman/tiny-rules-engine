/**
 * Tiny rules engine with two evaluation strategies.
 *
 * If a rule's condition matches, its action runs and returns that rule's result.
 * Observability plugs in via hooks — see `observability.ts`.
 * Unique names are compile-time via `rulesFor` in `utils/rules.ts`.
 */

import type {
  EvaluateAllOptions,
  EvaluateFirstMatchOptions,
  Rule,
} from "./types.ts";

/** First matching condition wins; returns that action's result (or undefined). */
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

/** Every matching rule's action runs; returns results in order. */
export function evaluateAll<TInput, TResult>(
  rules: readonly Rule<TInput, TResult>[],
  input: TInput,
  options?: EvaluateAllOptions<TResult>,
): TResult[];

/** Every matching rule's action runs; `combine` folds results into one value. */
export function evaluateAll<TInput, TResult, TCombined>(
  rules: readonly Rule<TInput, TResult>[],
  input: TInput,
  options: EvaluateAllOptions<TResult, TCombined> & {
    combine: (results: readonly TResult[]) => TCombined;
  },
): TCombined;

export function evaluateAll<TInput, TResult, TCombined>(
  rules: readonly Rule<TInput, TResult>[],
  input: TInput,
  options?: EvaluateAllOptions<TResult, TCombined>,
): TResult[] | TCombined {
  const results: TResult[] = [];

  for (const rule of rules) {
    if (!rule.condition(input)) continue;

    const result = rule.action(input);
    options?.hooks?.onMatch?.({ name: rule.name, result });
    results.push(result);
  }

  return options?.combine ? options.combine(results) : results;
}
