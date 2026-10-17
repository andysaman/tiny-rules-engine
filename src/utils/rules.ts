/**
 * Helpers for building rule lists.
 *
 * Kept separate from `types.ts` and `engine.ts` so definition helpers can
 * evolve without dragging evaluation or shared contracts along.
 */

type DuplicateRuleName<Name extends string> = `Duplicate rule name: ${Name}`;

/**
 * `true` when every `name` is a unique string literal; otherwise an error message.
 * Only meaningful when `name`s stay string literals — annotating `Rule<T>[]` widens them.
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

type RuleListItem<TInput, TResult> = {
  name: string;
  condition: (input: TInput) => boolean;
  action: (input: TInput) => TResult;
};

/**
 * Bind input/result types, then `.define([...])` the rule list.
 *
 * Split this way so call sites read as type-binding then definition — TypeScript
 * needs that order to check action returns and unique names at this site.
 *
 * @example
 * rulesFor<Ctx, Result>().define([
 *   { name: "a", condition: (ctx) => true, action: () => "ok" },
 *   { name: "a", ... }, // type error: duplicate name
 *   { name: "b", condition: (ctx) => true, action: () => 42 }, // type error: not Result
 * ])
 */
export function rulesFor<TInput, TResult>() {
  return {
    define<const TRules extends readonly RuleListItem<TInput, TResult>[]>(
      rules: AssertUniqueRuleNames<TRules> extends true
        ? TRules
        : AssertUniqueRuleNames<TRules>,
    ): TRules {
      return rules as TRules;
    },
  };
}
