// What a run spent, as the SDK reported it
type Spend = { inputTokens: number; outputTokens: number; costUsd: number };
// One run as recorded: whose session it ran on, how long it took, and the totals the SDK reported at its end
export type RunSpend = Spend & {
  memberId: number;
  agentSessionId: number;
  model: string;
  seconds: number;
  side: boolean;
};
// A member's spend on one model in a session
export type Usage = Spend & { memberId: number; model: string; runs: number; seconds: number };

const NO_SPEND: Spend = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

// The SDK reports a resumed session's running totals, so a run's own spend is what grew since the session's last report
function ownSpend(run: Spend, last: Spend | null): Spend {
  // Totals that went down mean the session started counting again, as when its transcript kept no totals
  const grew =
    last && run.inputTokens >= last.inputTokens && run.outputTokens >= last.outputTokens && run.costUsd >= last.costUsd;
  if (!grew) return run;
  return {
    inputTokens: run.inputTokens - last.inputTokens,
    outputTokens: run.outputTokens - last.outputTokens,
    costUsd: run.costUsd - last.costUsd,
  };
}

// Each member's spend per model, the costliest first; runs come in the order they started
export function usage(runs: RunSpend[]): Usage[] {
  const sums = new Map<string, Usage>();
  // What each Claude session had reported so far; a resumed session's totals start from there
  const before = new Map<number, RunSpend>();
  for (const r of runs) {
    const last = before.get(r.agentSessionId);
    const own = ownSpend(r, last && last.model === r.model ? last : null);
    // A run that never reported (still running, or cut before its result) says nothing about the session's totals
    if (!r.side && (r.costUsd || r.inputTokens || r.outputTokens)) before.set(r.agentSessionId, r);
    const key = `${r.memberId} ${r.model}`;
    const sum = sums.get(key) ?? { memberId: r.memberId, model: r.model, runs: 0, seconds: 0, ...NO_SPEND };
    sums.set(key, {
      ...sum,
      runs: sum.runs + 1,
      seconds: sum.seconds + r.seconds,
      inputTokens: sum.inputTokens + own.inputTokens,
      outputTokens: sum.outputTokens + own.outputTokens,
      costUsd: sum.costUsd + own.costUsd,
    });
  }
  return [...sums.values()].sort((a, b) => b.costUsd - a.costUsd);
}
