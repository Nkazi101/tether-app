import type { Comparison } from "../../src/lib/comparison";
export type CurrentCheckpoint = Pick<Comparison,"research"> & Partial<Pick<Comparison,"currentEpisode"|"currentFrame">>;
export class ResearchDeferred extends Error {
  readonly availableAt: string;
  constructor(readonly checkpoint: CurrentCheckpoint | null = null,readonly reason:"allowance"|"provider"="allowance") {
    super(reason==="provider"?"The research provider did not complete. Existing readings are retained while this request waits to retry.":"Research is queued for the next daily allowance. Existing readings are retained.");
    const next = new Date(); next.setUTCDate(next.getUTCDate()+1); next.setUTCHours(0,5,0,0);
    this.availableAt = reason==="provider"?new Date(Date.now()+120000).toISOString():next.toISOString();
  }
}
