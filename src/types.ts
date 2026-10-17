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
