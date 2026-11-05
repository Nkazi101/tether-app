import dotenv from "dotenv";
import cron from "node-cron";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "../src/lib/supabase/server";
import { enqueuePublicBackfill } from "./services/public-backfill";
import { enqueueCanonExpansion } from "./services/canon-maintenance";
import {enqueueCanonChecks} from "./services/canon-verification";
import { Store } from "./services/store";
dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });
const store = new Store(getSupabaseServerClient());
const instance = `scheduler:${randomUUID()}`;
const beat = () =>
  store.rpc("tether_heartbeat", { p_instance: instance, p_kind: "scheduler" });
async function enqueue() {
  const slot = Math.floor(Date.now() / (2 * 3600000));
  await store.rpc("tether_enqueue", {
    p_kind: "ingest",
    p_key: `ingest:${slot}`,
    p_owner: "system:scheduler",
    p_user: null,
    p_payload: {},
    p_ip: "scheduler",
    p_user_limit: 24,
    p_ip_limit: 24,
    p_global_limit: 5000,
  });
  console.info(JSON.stringify({ event: "ingestion-enqueued", slot }));
  console.info(JSON.stringify({ event: "research-backfill-enqueued", ...await enqueuePublicBackfill(store,12) }));
  console.info(JSON.stringify({ event: "canon-expansion-enqueued", ...await enqueueCanonExpansion(store) }));
  console.info(JSON.stringify({ event: "canon-checks-enqueued", ...await enqueueCanonChecks(store) }));
}
await enqueue();
await beat();
if (!process.argv.includes("--once")) {
  const heartbeat = setInterval(() => {
    void beat().catch(() =>
      console.error(JSON.stringify({ event: "scheduler-heartbeat-failed" })),
    );
  }, 30000);
  const task = cron.schedule(
    "0 */2 * * *",
    async () => {
      await enqueue().catch(() =>
        console.error(JSON.stringify({ event: "scheduler-enqueue-failed" })),
      );
    },
    { timezone: "UTC", noOverlap: true },
  );
  const stop = () => {
    clearInterval(heartbeat);
    task.stop();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
