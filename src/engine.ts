/**
 * Tiny ordered rules engine.
 *
 * Rules are pure predicates + effects. The engine evaluates them in order,
 * applies matching effects to a context copy, and returns an inspectable trace.
 * That inspectability is the point: business logic stays readable and testable.
 */

export type RuleContext = Record<string, unknown>;

export type RuleEffect = {
  set?: Record<string, unknown>;
  messages?: string[];
};

export type Rule<TContext extends RuleContext = RuleContext> = {
  id: string;
  description: string;
  when: (ctx: Readonly<TContext>) => boolean;
  then: (ctx: Readonly<TContext>) => RuleEffect;
};

export type RuleHit = {
  id: string;
  description: string;
  effect: RuleEffect;
};

export type EvaluateResult<TContext extends RuleContext = RuleContext> = {
  context: TContext;
  hits: RuleHit[];
  messages: string[];
};

function applyEffect<TContext extends RuleContext>(
  ctx: TContext,
  effect: RuleEffect,
): TContext {
  const next = { ...ctx, ...(effect.set ?? {}) } as TContext;
  return next;
}

export function evaluateRules<TContext extends RuleContext>(
  rules: readonly Rule<TContext>[],
  initial: TContext,
): EvaluateResult<TContext> {
  let context = { ...initial };
  const hits: RuleHit[] = [];
  const messages: string[] = [];

  for (const rule of rules) {
    if (!rule.when(context)) continue;
    const effect = rule.then(context);
    hits.push({ id: rule.id, description: rule.description, effect });
    if (effect.messages?.length) messages.push(...effect.messages);
    context = applyEffect(context, effect);
  }

  return { context, hits, messages };
}
