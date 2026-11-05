import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "../src/lib/supabase/server";
import { Store } from "./services/store";
import { processComparisonJob } from "./services/processor";
import { ingestReporting } from "./services/ingestion";
import { ResearchDeferred } from "./domain/research-deferred";
import {runCanonCheck} from "./services/canon-verification";
import { InputError } from "./services/article";

dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });
export async function runOneJob(store: Store, dependencies: Parameters<typeof processComparisonJob>[2] = {}) {
  const job = await store.claim();
  if (!job) return false;
  const started = Date.now();
  const heartbeat = setInterval(() => {
    void store
      .rpc("tether_renew_job", { p_id: job.id, p_lease: job.lease_token })
      .catch(() => {});
  }, 30000);
  try {
    if (job.kind === "ingest") {
      await ingestReporting(store);
      const finished = await store.rpc<boolean>("tether_finish_job", {
        p_id: job.id,
        p_lease: job.lease_token,
      });
      if (!finished)
        throw Object.assign(
          new Error("Ingestion lease expired before completion."),
          { code: "40001" },
        );
    } else if(job.payload.canonCheck){
      await runCanonCheck(store,job);
      if(!await store.rpc<boolean>('tether_finish_job',{p_id:job.id,p_lease:job.lease_token}))throw new Error('Canon check lease expired.');
    } else await processComparisonJob(store, job, dependencies);
    console.info(
      JSON.stringify({
        event: "job-completed",
        jobId: job.id,
        kind: job.kind,
        durationMs: Date.now() - started,
      }),
    );
  } catch (error) {
    if (error instanceof ResearchDeferred) {
      const deferred = await store.rpc<boolean>("tether_defer_job", { p_id: job.id, p_lease: job.lease_token, p_available: error.availableAt, p_checkpoint: error.checkpoint });
      if (!deferred) throw new Error("The research lease expired before deferral.");
      console.info(JSON.stringify({ event: "research-deferred", jobId: job.id, availableAt: error.availableAt }));
      return true;
    }
    const inputError = error instanceof InputError;
    const message = inputError
      ? error.message
      : "The analysis could not be completed. Your published comparisons are retained; refine the request or ask for another attempt.";
    await store.rpc("tether_fail_job", {
      p_id: job.id,
      p_lease: job.lease_token,
      p_error: message,
      p_retry: !inputError,
    });
    console.error(
      JSON.stringify({
        event: "job-failed",
        jobId: job.id,
        kind: job.kind,
        durationMs: Date.now() - started,
        code: inputError
          ? error.status
          : (error as { code?: string }).code || "processing-error",
      }),
    );
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
async function main() {
  const store = new Store(getSupabaseServerClient());
  let stopping = false;
  const instance = `worker:${randomUUID()}`;
  const beat = () =>
    store
      .rpc("tether_heartbeat", { p_instance: instance, p_kind: "worker" })
      .catch(() =>
        console.error(JSON.stringify({ event: "worker-heartbeat-failed" })),
      );
  await beat();
  const heartbeat = setInterval(() => {
    void beat();
  }, 30000);
  process.on("SIGTERM", () => {
    stopping = true;
  });
  process.on("SIGINT", () => {
    stopping = true;
  });
  while (!stopping) {
    try {
      const worked = await runOneJob(store);
      if (process.argv.includes("--once")) break;
      if (!worked) await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch {
      console.error(JSON.stringify({ event: "worker-store-unavailable" }));
      if (process.argv.includes("--once")) process.exitCode = 1;
      if (process.argv.includes("--once")) break;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  clearInterval(heartbeat);
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(new URL(`file://${process.argv[1]}`))
)
  void main();
