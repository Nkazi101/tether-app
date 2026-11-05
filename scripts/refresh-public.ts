import dotenv from "dotenv";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { resolve } from "node:path";
import { getSupabaseServerClient } from "../src/lib/supabase/server";
import { validateComparison, type Comparison } from "../src/lib/comparison";
import { Store, jobSchema, type DurableJob } from "../server/services/store";
import { ingestReporting } from "../server/services/ingestion";
import { runOneJob } from "../server/worker";
import { RESEARCH_VERSION } from "../server/services/episode-research";

dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });
const directory = resolve("audit/narrative-refresh");
mkdirSync(directory, { recursive: true });
const filename = resolve(directory, "manifest.json");
type Target = {
  situationId: string;
  previousId: string;
  jobId: string;
  owner: string;
  topic: string;
  title: string;
  previousJobIds?: string[];
};
type Candidate = {
  id: string;
  owner_key: string;
  latest_analysis_id: string;
  title: string;
  topic: string;
};
type Manifest = {
  id: string;
  version: string;
  createdAt: string;
  maxCalls: number;
  maxReservedUnits: number;
  targets: Target[];
  ingestion: unknown;
  candidates?: Candidate[];
};
const db = getSupabaseServerClient();
const plain = new Store(db);
const readManifest = (): Manifest => JSON.parse(readFileSync(filename, "utf8"));
const writeManifest = (manifest: Manifest) => {
  writeFileSync(filename + ".tmp", JSON.stringify(manifest, null, 2));
  renameSync(filename + ".tmp", filename);
};
async function allPublic() {
  const rows: Array<{
    id: string;
    owner_key: string;
    latest_analysis_id: string;
    title: string;
    topic: string;
  }> = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await db
      .from("tether_situations")
      .select("id,owner_key,latest_analysis_id,title,topic")
      .eq("is_public", true)
      .order("id")
      .range(offset, offset + 199);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 200) break;
  }
  return rows;
}
async function prepare() {
  let manifest: Manifest;
  let rows: Candidate[];
  if (existsSync(filename)) {
    manifest = readManifest();
    if (
      !manifest.candidates ||
      manifest.targets.length >= manifest.candidates.length
    )
      throw new Error(
        "A prepared manifest already exists. Resume run; do not silently start another paid refresh.",
      );
    rows = manifest.candidates;
  } else {
    const pending = await db
      .from("tether_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "running"]);
    if (pending.error) throw pending.error;
    if (pending.count)
      throw new Error(
        "Prepare requires an idle queue. Existing work must finish first.",
      );
    const ingestion = await ingestReporting(plain, { queueResearch: false });
    for (let count = 0; count < 200; count++) {
      if (!(await runOneJob(plain))) break;
    }
    rows = await allPublic();
    manifest = {
      id: `public-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`,
      version: RESEARCH_VERSION,
      createdAt: new Date().toISOString(),
      maxCalls: rows.length * 5,
      maxReservedUnits: rows.length * 350_000,
      targets: [],
      candidates: rows,
      ingestion,
    };
    writeManifest(manifest);
  }
  for (const row of rows) {
    if (manifest.targets.some((target) => target.situationId === row.id))
      continue;
    if (!row.owner_key.startsWith("system:") || !row.latest_analysis_id)
      throw new Error("Public refresh must not take ownership of reader work.");
    const previous = await plain.analysis(row.latest_analysis_id);
    if (!previous) throw new Error("A public analysis is missing.");
    const job = jobSchema.parse(
      await plain.rpc("tether_enqueue", {
        p_kind: "research",
        p_key: `${manifest.id}:${manifest.version}:${row.id}`,
        p_owner: row.owner_key,
        p_user: null,
        p_payload: {
          situationId: row.id,
          input: row.title,
          question:
            "What human story is taking shape here, who casts each role and holds power, and which earlier episodes illuminate the pattern and its limits?",
          sources: previous.sources,
          walkthrough: previous.inputMode === "walkthrough",
          refreshSources: previous.inputMode !== "walkthrough",
          forceReassessment: true,
          depth: 1,
        },
        p_ip: manifest.id,
        p_user_limit: 2000,
        p_ip_limit: 2000,
        p_global_limit: 5000,
      }),
    );
    manifest.targets.push({
      situationId: row.id,
      previousId: previous.id,
      jobId: job.id,
      owner: row.owner_key,
      topic: row.topic,
      title: row.title,
    });
    writeManifest(manifest);
  }
  console.log(
    JSON.stringify({
      event: "refresh-prepared",
      id: manifest.id,
      targets: manifest.targets.length,
      maxCalls: manifest.maxCalls,
      maxReservedUnits: manifest.maxReservedUnits,
      ingestion: manifest.ingestion,
    }),
  );
}

const context = new AsyncLocalStorage<{ jobId: string }>();
class RefreshStore extends Store {
  current: DurableJob | null = null;
  readonly allowed: Set<string>;
  constructor(readonly manifest: Manifest) {
    super(db);
    this.allowed = new Set(manifest.targets.map((target) => target.jobId));
  }
  override async claim() {
    this.current = await super.claim();
    return this.current;
  }
  override async rpc<T>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    if (
      name === "tether_reserve_model" &&
      this.current &&
      this.allowed.has(this.current.id) &&
      String(args.p_key).startsWith("model:")
    ) {
      const suffix = String(args.p_key).slice(6);
      // The underlying reservation function uses UTC-day buckets. Refuse a
      // fresh day's allowance for the same manifest; otherwise a resumed or
      // long-running refresh could silently double its spending allowance.
      if (
        suffix !== "observed-tokens" &&
        new Date().toISOString().slice(0, 10) !==
          this.manifest.createdAt.slice(0, 10)
      )
        return false as T;
      // Explicit one-off public migration allowance. Normal reader/background
      // limits and private-job reservations are unchanged. The ledger is durable.
      return super.rpc<T>(name, {
        ...args,
        p_key: `refresh:${this.manifest.id}:${suffix}`,
        p_limit:
          suffix === "reserved-tokens"
            ? this.manifest.maxReservedUnits
            : suffix === "observed-tokens"
              ? 1_000_000_000
              : this.manifest.maxCalls,
      });
    }
    return super.rpc<T>(name, args);
  }
}
async function status(manifest: Manifest) {
  const jobs: Array<{
    id: string;
    status: string;
    result_id: string | null;
    error_message: string | null;
  }> = [];
  for (let offset = 0; offset < manifest.targets.length; offset += 50) {
    const result = await db
      .from("tether_jobs")
      .select("id,status,result_id,error_message")
      .in(
        "id",
        manifest.targets
          .slice(offset, offset + 50)
          .map((target) => target.jobId),
      );
    if (result.error) throw result.error;
    jobs.push(...result.data);
  }
  const analyses: Comparison[] = [];
  const resultIds = jobs.flatMap((job) =>
    job.result_id ? [job.result_id] : [],
  );
  for (let offset = 0; offset < resultIds.length; offset += 30) {
    const result = await db
      .from("tether_analyses")
      .select("payload")
      .in("id", resultIds.slice(offset, offset + 30));
    if (result.error) throw result.error;
    analyses.push(...result.data.map((row) => validateComparison(row.payload)));
  }
  const usage = await db
    .from("tether_usage")
    .select("scope_key,day,units")
    .like("scope_key", `refresh:${manifest.id}:%`);
  if (usage.error) throw usage.error;
  const summary = {
    id: manifest.id,
    targets: manifest.targets.length,
    jobs: Object.fromEntries(
      ["queued", "running", "succeeded", "failed"].map((state) => [
        state,
        jobs.filter((job) => job.status === state).length,
      ]),
    ),
    withLenses: analyses.filter((a) => a.lenses.length).length,
    withHistoricalLens: analyses.filter((a) =>
      a.lenses.some((lens) => lens.historical),
    ).length,
    withPlan: analyses.filter((a) => a.research?.narrativePlan).length,
    researchComplete: analyses.filter((a) => a.research?.status === "searched")
      .length,
    limited: analyses.filter((a) => a.research?.status !== "searched").length,
    usage: usage.data,
    results: jobs.map((job) => {
      const a = analyses.find((a) => a.id === job.result_id);
      return {
        ...manifest.targets.find((t) => t.jobId === job.id),
        status: job.status,
        resultId: job.result_id,
        error: job.error_message,
        lenses: a?.lenses.length || 0,
        researchStatus: a?.research?.status || null,
        note: a?.research?.note || null,
        unknowns: a?.unknowns || [],
      };
    }),
  };
  writeFileSync(
    resolve(directory, "status.json"),
    JSON.stringify(summary, null, 2),
  );
  return summary;
}
async function run(manifest: Manifest) {
  if (
    !manifest.targets.length ||
    manifest.version !== RESEARCH_VERSION ||
    (manifest.candidates &&
      manifest.targets.length !== manifest.candidates.length)
  )
    throw new Error("The manifest must target the current research version.");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg
    ? Math.max(1, Number(limitArg.split("=")[1]))
    : Infinity;
  const concurrencyArg = process.argv.find((arg) =>
    arg.startsWith("--concurrency="),
  );
  const concurrency = concurrencyArg
    ? Math.min(8, Math.max(1, Number(concurrencyArg.split("=")[1])))
    : 4;
  if (
    !Number.isSafeInteger(concurrency) ||
    concurrency < 1 ||
    (limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 1))
  )
    throw new Error("Limits and concurrency must be positive integers.");
  const allowedCapture = new Set(
    manifest.targets.map((target) => target.jobId),
  );
  const originalFetch = globalThis.fetch;
  const endpoint = (
    process.env.MUSE_API_BASE_URL || "https://api.meta.ai/v1"
  ).replace(/\/$/, "");
  globalThis.fetch = async (url, init) => {
    const response = await originalFetch(url, init);
    const current = context.getStore();
    if (
      current &&
      allowedCapture.has(current.jobId) &&
      String(url).startsWith(endpoint) &&
      init?.method === "POST"
    ) {
      // Only public refresh response bodies; no keys, headers or private prompts.
      const body = await response.clone().text();
      mkdirSync(resolve(directory, "responses"), { recursive: true });
      if (init.body)
        writeFileSync(
          resolve(
            directory,
            "responses",
            `${current.jobId}-${Date.now()}-request.json`,
          ),
          String(init.body),
        );
      const path = resolve(
        directory,
        "responses",
        `${current.jobId}-${Date.now()}-${String(url).endsWith("/responses") ? "search" : "json"}.json`,
      );
      mkdirSync(resolve(directory, "responses"), { recursive: true });
      writeFileSync(path, body);
    }
    return response;
  };
  const instance = `worker:refresh:${manifest.id}`;
  const beat = () =>
    plain.rpc("tether_heartbeat", { p_instance: instance, p_kind: "worker" });
  await beat();
  const heartbeat = setInterval(() => {
    void beat().catch(() => {});
  }, 30000);
  let count = 0;
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, limit) }, async () => {
        const store = new RefreshStore(manifest);
        const claim = store.claim.bind(store);
        store.claim = async () => {
          const job = await claim();
          if (job && store.allowed.has(job.id))
            context.getStore()!.jobId = job.id;
          return job;
        };
        while (!stopping && count < limit) {
          count++;
          const worked = await context.run({ jobId: "" }, () =>
            runOneJob(store),
          );
          if (!worked) break;
        }
      }),
    );
  } finally {
    clearInterval(heartbeat);
    globalThis.fetch = originalFetch;
    process.off("SIGTERM", stop);
    process.off("SIGINT", stop);
  }
  const result = await status(manifest);
  console.log(
    JSON.stringify({ event: "refresh-status", ...result, results: undefined }),
  );
}
const mode = process.argv[2];
if (mode === "prepare") await prepare();
else if (mode === "run") await run(readManifest());
else if (mode === "status") {
  const value = await status(readManifest());
  console.log(JSON.stringify({ ...value, results: undefined }, null, 2));
} else
  throw new Error(
    "Use prepare, run [--limit=1] [--concurrency=4], or status. Requires server-only credentials.",
  );
