import dotenv from "dotenv";
import { getSupabaseServerClient } from "../src/lib/supabase/server";
import { Store } from "../server/services/store";
import { energySources } from "../server/domain/cases";
import { runOneJob } from "../server/worker";
dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });
const store = new Store(getSupabaseServerClient());
const owner = "system:walkthrough:energy-2022";
const job = await store.rpc<{ id: string }>("tether_enqueue", {
  p_kind: "analysis",
  p_key: "source-pack-2026-11-03-v4",
  p_owner: owner,
  p_user: null,
  p_payload: {
    input: "Europe’s 2022 gas crisis: import dependence under pressure",
    question:
      "How does the 1973 oil embargo help explain supply dependence, and where does that analogy break?",
    sources: energySources.map((source) => ({ ...source, kind: "reporting" })),
    walkthrough: true,
  },
  p_ip: "editorial-seed",
  p_user_limit: 10,
  p_ip_limit: 10,
  p_global_limit: 5000,
});
// Processing uses the real leased worker contract. A running worker may claim
// the job first; either route publishes through the same transaction.
for (let count = 0; count < 10; count++) {
  const state = await store.job(job.id, owner);
  if (state?.status === "succeeded") {
    console.log(
      JSON.stringify({ analysisId: state.result_id, status: state.status }),
    );
    break;
  }
  if (state?.status === "failed")
    throw new Error(
      state.error_message || "Walkthrough could not be published.",
    );
  await runOneJob(store);
}
