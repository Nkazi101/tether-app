import {MIN_HISTORICAL_DISTANCE_YEARS} from '../src/lib/cross-context';
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createHmac, randomBytes } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type Comparison,
  analysisRequestSchema,
  observationSchema,
  forecastRequestSchema,
  topicSchema,
} from "../src/lib/comparison";
import { Store, hash } from "./services/store";
import { canonicalCases, CANON_EDITION } from "./domain/canon";
import structuralBenchmark from "./data/structural-benchmark.json";
import { illuminationSchema } from "../src/lib/paired-story";
import { corpusCoverage } from "../src/lib/corpus-coverage";
import {readableHistoricalCase} from './services/narrative-research';
import { InputError, validateArticleUrl } from "./services/article";
import { feedImages, sourceImage } from "./services/media";

interface Identity {
  owner: string;
  guestOwner: string;
  userId: string | null;
  ip: string;
}
const uuid = z.string().uuid();
const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
export function createLivingApi(db: SupabaseClient | null) {
  const api = Router();
  const store = db ? new Store(db) : null;
  const identities = new WeakMap<Request, Identity>();
  api.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Cookie, Authorization");
    if (req.method !== "GET" && req.headers.origin) {
      const expected =
        process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
      if (req.headers.origin !== expected) {
        res.status(403).json({ error: "This request must come from Tether." });
        return;
      }
    }
    next();
  });
  async function identity(req: Request, res: Response): Promise<Identity> {
    const cached = identities.get(req);
    if (cached) return cached;
    if (!db || !store)
      throw new InputError("The evidence store is not configured.", 503);
    const auth = req.headers.authorization;
    let userId: string | null = null;
    if (auth) {
      if (!auth.startsWith("Bearer "))
        throw new InputError("Sign in again to continue.", 401);
      const { data, error } = await db.auth.getUser(auth.slice(7));
      if (error || !data.user)
        throw new InputError("Sign in again to continue.", 401);
      userId = data.user.id;
    }
    const cookies = req.headers.cookie || "";
    let token = cookies.match(
      /(?:^|;\s*)tether_session=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    if (!token) {
      token = randomBytes(32).toString("hex");
      res.append(
        "Set-Cookie",
        `tether_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      );
    }
    const secret =
      process.env.SESSION_HASH_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "";
    const digest = (value: string) =>
      createHmac("sha256", secret).update(value).digest("hex");
    const value = {
      owner: userId ? `user:${userId}` : `guest:${digest(token)}`,
      guestOwner: `guest:${digest(token)}`,
      userId,
      ip: digest(req.ip || req.socket.remoteAddress || "unknown"),
    };
    identities.set(req, value);
    return value;
  }
  async function signedIn(req: Request, res: Response) {
    const user = await identity(req, res);
    if (!user.userId)
      throw new InputError("Sign in to keep following this situation.", 401);
    return { ...user, userId: user.userId };
  }
  async function canRead(id: string, actor: Identity) {
    const situation = await store!.situation(uuid.parse(id));
    if (
      situation &&
      !situation.is_public &&
      situation.owner_key === actor.guestOwner &&
      actor.userId
    ) {
      await store!.rpc("tether_claim_situation", {
        p_id: situation.id,
        p_guest: actor.guestOwner,
        p_user: actor.userId,
      });
      situation.owner_key = actor.owner;
      situation.owner_user_id = actor.userId;
    }
    if (
      !situation ||
      (!situation.is_public && situation.owner_key !== actor.owner)
    )
      throw new InputError(
        "This situation was not found in your reading desk.",
        404,
      );
    return situation;
  }
  const jobView = (job: Awaited<ReturnType<Store["enqueue"]>>) => ({
    id: job.id,
    status: job.status,
    resultId: job.result_id,
    error: job.status === "failed" ? job.error_message : null,
    createdAt: job.created_at,
    resumeAt: job.status === "queued" && job.available_at && Date.parse(job.available_at) > Date.now() ? job.available_at : null,
  });
  const key = (req: Request) =>
    z
      .string()
      .regex(/^[a-zA-Z0-9:_-]{8,120}$/)
      .parse(req.get("Idempotency-Key") || randomBytes(16).toString("hex"));

  api.get("/health/live", (_req, res) => res.json({ status: "alive" }));
  api.get("/media/feed", asyncRoute(async (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.json({images: await feedImages()});
  }));
  api.get("/analyses/:id/media", asyncRoute(async (req, res) => {
    const actor = await identity(req, res);
    const comparison = await store!.analysis(uuid.parse(req.params.id));
    if (!comparison) throw new InputError("This comparison was not found.", 404);
    await canRead(comparison.situationId, actor);
    return res.json({image: await sourceImage(comparison.sources.find(source => source.kind === "reporting"))});
  }));
  api.get(
    "/health/ready",
    asyncRoute(async (_req, res) => {
      if (!store)
        return res.status(503).json({
          status: "not-ready",
          reason: "Evidence store is not configured.",
        });
      const { error } = await store.db
        .from("tether_jobs")
        .select("id")
        .limit(1);
      return res.status(error ? 503 : 200).json({
        status: error ? "not-ready" : "ready",
        database: !error,
        schema: !error,
      });
    }),
  );
  api.get(
    "/health/worker",
    asyncRoute(async (_req, res) => {
      if (!store) return res.status(503).json({ status: "unavailable" });
      const { data, error } = await store.db
        .from("tether_runtime")
        .select("seen_at")
        .eq("kind", "worker")
        .gte("seen_at", new Date(Date.now() - 90000).toISOString())
        .limit(1);
      const available = !error && Boolean(data?.length);
      return res.status(available ? 200 : 503).json({
        status: available
          ? "processing-available"
          : "no-recent-worker-heartbeat",
      });
    }),
  );
  let gridCache: Promise<ReturnType<typeof corpusCoverage>> | null = null;
  let gridExpires = 0;
  const historicalGrid = () => {
    if (!gridCache || Date.now() >= gridExpires) {
      gridExpires = Date.now() + 60000;
      gridCache = store!.cases().then(cases => corpusCoverage(cases.flatMap(c=>{const readable=readableHistoricalCase(c),end=readable?.narrativeRecord?.endYear;return readable&&end!==null&&end!==undefined&&end<=new Date().getUTCFullYear()-MIN_HISTORICAL_DISTANCE_YEARS?[readable]:[];})))
        .catch(error => { gridCache = null; throw error; });
    }
    return gridCache;
  };
  api.get("/coverage", asyncRoute(async (_req,res) => {
    if (!store) throw new InputError("The evidence store is not configured.",503);
    const progress = await store.rpc("tether_public_research_coverage");
    const grid=await historicalGrid(),starts=grid.entries.flatMap(e=>e.startYear===null?[]:[e.startYear]),ends=grid.entries.flatMap(e=>e.endYear===null?[]:[e.endYear]);
    res.json({progress,grid,canon:{edition:`source-library:${hash(grid.entries).slice(0,16)}`,cases:grid.entries.length,regions:[...new Set(grid.entries.flatMap(e=>e.regions))],domains:[...new Set(grid.entries.flatMap(e=>e.domains))],oldestYear:starts.length?Math.min(...starts):null,newestYear:ends.length?Math.max(...ends):null,process:"Source packets with recorded encoding and checks; not independent historical validation"},benchmark:{classification:structuralBenchmark.classification,cases:structuralBenchmark.cases,checks:structuralBenchmark.checks,passed:structuralBenchmark.passed,independentHistoricalAccuracy:null,limitations:structuralBenchmark.limitations}});
  }));
  api.get("/reading/discover", asyncRoute(async (_req, res) => {
    if (!store) throw new InputError("The evidence store is not configured.", 503);
    return res.json(await store.discoveryReadings());
  }));
  api.get('/reading/connections',asyncRoute(async(req,res)=>{
    if(!store)throw new InputError('The evidence store is not configured.',503);
    const topic=req.query.topic?topicSchema.parse(req.query.topic):undefined;
    return res.json(await store.discoveryConnections(topic));
  }));
  api.get(
    "/reading/public",
    asyncRoute(async (req, res) => {
      if (!store)
        throw new InputError("The evidence store is not configured.", 503);
      const topic = req.query.topic
        ? topicSchema.parse(req.query.topic)
        : undefined;
      let cursor: { date: string; id: string } | undefined;
      if (req.query.cursor) {
        try {
          cursor = z
            .object({ date: z.string().datetime({ offset: true }), id: uuid })
            .parse(
              JSON.parse(
                Buffer.from(
                  z.string().max(300).parse(req.query.cursor),
                  "base64url",
                ).toString(),
              ),
            );
        } catch {
          throw new InputError("This reading cursor is invalid.");
        }
      }
      return res.json({
        ...(await store.publicReadings({
          topic,
          cursor,
          examples: req.query.examples === "true",
          connections: req.query.connections === "true",
        })),
        counts: await store.rpc("tether_feed_counts"),
      });
    }),
  );
  api.get(
    "/archive",
    asyncRoute(async (_req, res) => {
      if (!store)
        throw new InputError("The evidence store is not configured.", 503);
      return res.json({ cases: await store.cases() });
    }),
  );
  api.post(
    "/analyses",
    asyncRoute(async (req, res) => {
      const input = analysisRequestSchema.parse(req.body);
      if (/^https?:\/\//i.test(input.input)) validateArticleUrl(input.input);
      const actor = await identity(req, res);
      if (input.situationId) {
        const situation = await canRead(input.situationId, actor);
        if (situation.owner_key !== actor.owner)
          throw new InputError(
            "Create a personal comparison before revising a public example.",
            403,
          );
      }
      const job = await store!.enqueue(
        "analysis",
        key(req),
        actor.owner,
        actor.userId,
        input,
        actor.ip,
      );
      return res.status(202).json({ job: jobView(job) });
    }),
  );
  const feedbackCase=(req:Request,comparison:Comparison)=>{
    const id=req.query.case;
    if(id!==undefined&&(typeof id!=='string'||id.length>150))throw new InputError('Invalid parallel.',400);
    const cases=[comparison.primary,...comparison.alternatives.map(a=>a.historicalCase)].filter(Boolean);
    const selected=id?cases.find(c=>c!.id===id):comparison.primary;
    if(id&&(!selected||!comparison.narrativeLens?.parallels.some(p=>p.caseId===id)&&comparison.primary?.id!==id))throw new InputError('Parallel not found in this comparison version.',404);
    return selected;
  };
  api.route("/analyses/:id/illumination")
    .get(asyncRoute(async (req, res) => {
      const actor = await identity(req, res);
      const comparison = await store!.analysis(uuid.parse(req.params.id));
      if (!comparison) throw new InputError("Comparison not found.", 404);
      await canRead(comparison.situationId, actor);
      const selected=feedbackCase(req,comparison);if(!selected)return res.json({feedback:null});
      const { data, error } = await db!.from("tether_illumination").select("verdict,reason,pattern,explanation_seen").eq("analysis_id", comparison.id).eq("owner_key", actor.owner).eq("case_id",selected.id).maybeSingle();
      if (error) throw error;
      return res.json({ feedback: data ? { verdict: data.verdict, reason: data.reason, pattern: data.pattern, explanationSeen: data.explanation_seen } : null });
    }))
    .put(asyncRoute(async (req, res) => {
      const input = illuminationSchema.parse(req.body);
      const actor = await identity(req, res);
      const comparison = await store!.analysis(uuid.parse(req.params.id));
      if (!comparison) throw new InputError("Comparison not found.", 404);
      await canRead(comparison.situationId, actor);
      if ((!comparison.pairedStory && !comparison.narrativeLens) || !comparison.primary) throw new InputError("This version has no aligned comparison to rate.", 409);
      const selected=feedbackCase(req,comparison)!;
      for (const [scope, limit] of [[actor.owner, 60], [actor.ip, 180]] as const) {
        if (!(await store!.rpc<boolean>("tether_reserve_model", { p_key: `illumination:${scope}`, p_limit: limit, p_amount: 1 }))) throw new InputError("You’ve reached today’s feedback limit. Your last saved response is safe.", 429);
      }
      const { error } = await db!.from("tether_illumination").upsert({
        analysis_id: comparison.id, owner_key: actor.owner, owner_user_id: actor.userId,
        pair_fingerprint: hash(comparison.pairedStory || comparison.narrativeLens!.parallels.find(p=>p.caseId===selected.id)), case_id: selected.id, case_version: selected.version,
        alignment_version: comparison.pairedStory?.alignment.method || "narrative-context-1", verdict: input.verdict, reason: input.reason,
        pattern: input.pattern, explanation_seen: input.explanationSeen, updated_at: new Date().toISOString(),
      }, { onConflict: "analysis_id,owner_key,case_id" });
      if (error) throw error;
      return res.json({ feedback: input });
    }))
    .delete(asyncRoute(async (req, res) => {
      const actor = await identity(req, res);
      const comparison = await store!.analysis(uuid.parse(req.params.id));
      if (!comparison) throw new InputError("Comparison not found.", 404);
      await canRead(comparison.situationId, actor);
      const selected=feedbackCase(req,comparison);if(!selected)return res.json({feedback:null});
      const { error } = await db!.from("tether_illumination").delete().eq("analysis_id", comparison.id).eq("owner_key", actor.owner).eq("case_id",selected.id);
      if (error) throw error;
      return res.json({ feedback: null });
    }));
  api.post(
    "/analyses/:id/research",
    asyncRoute(async (req, res) => {
      const actor = await identity(req, res);
      const original = await store!.analysis(uuid.parse(req.params.id));
      if (!original)
        throw new InputError("This comparison was not found.", 404);
      const situation = await canRead(original.situationId, actor);
      const depth = Math.min(3, (original.research?.depth || 0) + 1);
      if ((original.research?.depth || 0) >= 3)
        throw new InputError(
          "This investigation has reached its three-pass search limit. Refine the question or supply newer evidence.",
        );
      const job = await store!.enqueue(
        "research",
        key(req),
        actor.owner,
        actor.userId,
        {
          input:
            original.title.length >= 12 ? original.title : original.summary,
          question: original.question,
          researchFrom: original.id,
          depth,
          ...(!situation.is_public ? { situationId: situation.id } : {}),
        },
        actor.ip,
      );
      return res.status(202).json({ job: jobView(job) });
    }),
  );
  api.get(
    "/jobs/:id",
    asyncRoute(async (req, res) => {
      const actor = await identity(req, res);
      const job =
        (await store!.job(uuid.parse(req.params.id), actor.owner)) ||
        (await store!.job(req.params.id, actor.guestOwner));
      if (!job) throw new InputError("This request was not found.", 404);
      return res.json({ job: jobView(job) });
    }),
  );
  api.get(
    "/analyses/:id",
    asyncRoute(async (req, res) => {
      const actor = await identity(req, res);
      const comparison = await store!.analysis(uuid.parse(req.params.id));
      if (!comparison)
        throw new InputError("This comparison was not found.", 404);
      const situation = await canRead(comparison.situationId, actor);
      // A guest analysis can be claimed by its original session after sign-in.
      return res.json({
        comparison,
        latestId: situation.latest_analysis_id,
        canRevise: situation.owner_key === actor.owner,
      });
    }),
  );
  api.get(
    "/situations/:id/history",
    asyncRoute(async (req, res) => {
      const actor = await identity(req, res);
      await canRead(req.params.id, actor);
      return res.json({ analyses: await store!.history(req.params.id) });
    }),
  );
  api.get(
    "/reading",
    asyncRoute(async (req, res) => {
      const actor = await signedIn(req, res);
      return res.json({ items: await store!.reading(actor.userId) });
    }),
  );
  api.put(
    "/reading/:id",
    asyncRoute(async (req, res) => {
      const actor = await signedIn(req, res);
      const situation = await canRead(req.params.id, actor);
      const input = z
        .object({
          following: z.boolean().optional(),
          savedAnalysisId: uuid.nullable().optional(),
          lastReadId: uuid.optional(),
        })
        .strict()
        .parse(req.body);
      for (const id of [input.savedAnalysisId, input.lastReadId].filter(
        (id): id is string => Boolean(id),
      )) {
        const analysis = await store!.analysis(id);
        if (!analysis || analysis.situationId !== situation.id)
          throw new InputError(
            "The comparison belongs to a different situation.",
          );
      }
      await store!.rpc("tether_reading_update", {
        p_user: actor.userId,
        p_situation: situation.id,
        p_patch: input,
      });
      return res.json({ saved: true });
    }),
  );
  api.post(
    "/situations/:id/observations",
    asyncRoute(async (req, res) => {
      const input = observationSchema.parse(req.body);
      const actor = await signedIn(req, res);
      const situation = await canRead(req.params.id, actor);
      if (Date.parse(input.observedAt) > Date.now() + 60000)
        throw new InputError("An observation cannot be dated in the future.");
      if (input.sourceUrl) validateArticleUrl(input.sourceUrl);
      const current = situation.latest_analysis_id
        ? await store!.analysis(situation.latest_analysis_id)
        : null;
      if (
        !current?.indicators.some(
          (indicator) => indicator.id === input.indicatorId,
        )
      )
        throw new InputError("Choose an indicator from this comparison.");
      const job = await store!.enqueue(
        "observation",
        key(req),
        actor.owner,
        actor.userId,
        {
          situationId: situation.id,
          observation: input,
          ...(situation.is_public ? { forkFromAnalysisId: current.id } : {}),
        },
        actor.ip,
      );
      return res.status(202).json({ job: jobView(job) });
    }),
  );
  api.get(
    "/situations/:id/forecasts",
    asyncRoute(async (req, res) => {
      const actor = await signedIn(req, res);
      await canRead(req.params.id, actor);
      return res.json({
        forecasts: await store!.forecasts(actor.userId, req.params.id),
      });
    }),
  );
  api.post(
    "/situations/:id/forecasts",
    asyncRoute(async (req, res) => {
      const input = forecastRequestSchema.parse(req.body);
      const actor = await signedIn(req, res);
      await canRead(req.params.id, actor);
      validateArticleUrl(input.resolutionSource);
      const closes = Date.parse(input.closesAt);
      if (closes <= Date.now() || closes > Date.now() + 10 * 365 * 86400000)
        throw new InputError("Choose a future closing date within ten years.");
      const id = await store!.rpc("tether_forecast_write", {
        p_user: actor.userId,
        p_situation: req.params.id,
        p_forecast: null,
        p_input: input,
        p_action: "create",
      });
      return res.status(201).json({ id });
    }),
  );
  api.post(
    "/forecasts/:id/revisions",
    asyncRoute(async (req, res) => {
      const input = z
        .object({
          probability: z.number().min(0).max(1),
          rationale: z.string().trim().min(10).max(2000),
        })
        .strict()
        .parse(req.body);
      const actor = await signedIn(req, res);
      const id = await store!.rpc("tether_forecast_write", {
        p_user: actor.userId,
        p_situation: null,
        p_forecast: uuid.parse(req.params.id),
        p_input: input,
        p_action: "revise",
      });
      return res.status(201).json({ id });
    }),
  );
  api.post(
    "/forecasts/:id/resolution",
    asyncRoute(async (req, res) => {
      const input = z
        .object({
          outcome: z.union([z.literal(0), z.literal(1)]),
          note: z.string().trim().min(30).max(3000),
        })
        .strict()
        .parse(req.body);
      const actor = await signedIn(req, res);
      const id = await store!.rpc("tether_forecast_write", {
        p_user: actor.userId,
        p_situation: null,
        p_forecast: uuid.parse(req.params.id),
        p_input: input,
        p_action: "resolve",
      });
      return res.json({ id });
    }),
  );
  api.get(
    "/operations/status",
    asyncRoute(async (req, res) => {
      const actor = await signedIn(req, res);
      const { data: profile } = await store!.db
        .from("profiles")
        .select("role")
        .eq("id", actor.userId)
        .single();
      if (profile?.role !== "admin")
        throw new InputError("Administrator access required.", 403);
      const [jobs, usage] = await Promise.all([
        store!.db
          .from("tether_jobs")
          .select("id,kind,status,attempts,created_at,updated_at,error_message")
          .order("created_at", { ascending: false })
          .limit(40),
        store!.db
          .from("tether_usage")
          .select("scope_key,day,units")
          .in("scope_key", [
            "model:calls",
            "model:reserved-tokens",
            "requests:global",
            "requests:background",
            "model:background-calls",
            "model:observed-tokens",
          ])
          .order("day", { ascending: false })
          .limit(18),
      ]);
      const { data: runtime, error: runtimeError } = await store!.db
        .from("tether_runtime")
        .select("kind,seen_at")
        .order("seen_at", { ascending: false })
        .limit(12);
      const { data: quarantined, error: quarantineError } = await store!.db
        .from("tether_case_quarantine")
        .select("case_version_id,reason,recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(10);
      if (jobs.error || usage.error || runtimeError || quarantineError)
        throw jobs.error || usage.error || runtimeError || quarantineError;
      return res.json({
        jobs: jobs.data,
        usage: usage.data,
        runtime,
        quarantined,
      });
    }),
  );
  api.post(
    "/operations/jobs/:id/retry",
    asyncRoute(async (req, res) => {
      const actor = await signedIn(req, res);
      const { data: profile } = await store!.db
        .from("profiles")
        .select("role")
        .eq("id", actor.userId)
        .single();
      if (profile?.role !== "admin")
        throw new InputError("Administrator access required.", 403);
      const { data: previous, error } = await store!.db
        .from("tether_jobs")
        .select("*")
        .eq("id", uuid.parse(req.params.id))
        .single();
      if (error || !previous || previous.status !== "failed")
        throw new InputError("Choose a failed job to retry.");
      // A new job preserves the failed attempt and consumes the normal allowance.
      const job = await store!.enqueue(
        previous.kind,
        `retry:${previous.id}:${key(req)}`,
        previous.owner_key,
        previous.owner_user_id,
        previous.payload,
        actor.ip,
      );
      return res.status(202).json({ job: jobView(job) });
    }),
  );
  // Old endpoints must not continue publishing contradictory judgments or
  // performing paid work through GET while old clients migrate.
  for (const path of [
    "/deep-dive",
    "/rag-search",
    "/explore/search",
    "/explore",
    "/feed",
    "/collections",
    "/pipeline/run",
    "/current-events/ingest",
  ])
    api.all(path, (_req, res) =>
      res.status(410).json({
        error:
          "This analysis path has been replaced. Open Explore to create a versioned comparison.",
      }),
    );
  api.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof z.ZodError)
        return res.status(400).json({
          error: error.issues[0]?.message || "Check the request fields.",
        });
      if (error instanceof InputError)
        return res.status(error.status).json({ error: error.message });
      const code = (error as { code?: string }).code;
      if (code === "42501")
        return res
          .status(404)
          .json({ error: "This private record was not found." });
      if (code === "P0001") {
        const message = (error as Error).message;
        if (
          /^(Forecast is closed|A resolved forecast|Resolve after|Choose a future)/.test(
            message,
          )
        )
          return res.status(409).json({ error: message });
        return res.status(429).json({
          error:
            "Your request allowance has been reached or three requests are already in progress. Please try later.",
        });
      }
      console.error(
        JSON.stringify({ event: "api-error", code: code || "internal" }),
      );
      return res.status(503).json({
        error:
          "The evidence store is temporarily unavailable. Your published comparisons are retained.",
      });
    },
  );
  return api;
}
