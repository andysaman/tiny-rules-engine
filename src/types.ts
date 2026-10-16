/**
 * Shared types for the rules engine.
 *
 * Types used by more than one module live here. Feature modules must not
 * export shared types — import from this file instead.
 */

export type Rule<TInput = unknown, TResult = unknown> = {
  name: string;
  condition: (input: Readonly<TInput>) => boolean;
  action: (input: Readonly<TInput>) => TResult;
};

export type MatchEvent<TResult = unknown> = {
  name: string;
  result: TResult;
};

/** Optional callbacks for observers; implementations live in other modules. */
export type EvaluateHooks<TResult = unknown> = {
  onMatch?: (event: MatchEvent<TResult>) => void;
};

export type EvaluateFirstMatchOptions<TResult = unknown> = {
  hooks?: EvaluateHooks<TResult>;
};

export type EvaluateAllOptions<TResult = unknown, TCombined = TResult[]> = {
  hooks?: EvaluateHooks<TResult>;
  /** Fold matched action results into a single return value. */
  combine?: (results: readonly TResult[]) => TCombined;
};

type DuplicateRuleName<Name extends string> = `Duplicate rule name: ${Name}`;

/**
 * `true` when every `name` is a unique string literal; otherwise an error message.
 * Only meaningful for `as const` / `defineRules` lists — widened `string` names cannot be checked.
 */
export type AssertUniqueRuleNames<
  Rules extends readonly { name: string }[],
  Seen extends string = never,
> =
  Rules extends readonly [
    infer Head extends { name: string },
    ...infer Tail extends { name: string }[],
  ]
    ? Head["name"] extends Seen
      ? DuplicateRuleName<Head["name"] & string>
      : AssertUniqueRuleNames<Tail, Seen | Head["name"]>
    : true;

/**
 * Identity helper that rejects duplicate literal `name`s at compile time.
 * Prefer this over annotating `Rule<T>[]` (which widens names to `string`).
 *
 * `defineRules<Input, Result>()([{ name: "a", ... }, ...])`
 */
export function defineRules<TInput, TResult = unknown>() {
  return function <const TRules extends readonly Rule<TInput, TResult>[]>(
    rules: AssertUniqueRuleNames<TRules> extends true
      ? TRules
      : AssertUniqueRuleNames<TRules>,
  ): TRules {
    return rules as TRules;
  };
}
