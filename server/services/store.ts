import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  caseSchema,
  forecastSchema,
  validateComparison,
  type Comparison,
  type HistoricalCase,
  type ReadingItem,
  type Forecast,
  type NewsTopic,
} from "../../src/lib/comparison";
import { canonicalCases } from "../domain/canon";
import { reviewedCases } from "../domain/cases";
import { isSameReportingEpisode } from "../domain/reporting";
import { validateCasePublication } from "../domain/case-review";
import {discoveryCandidateOrder} from "../../src/lib/discovery-diversity";

export const hash = (value: unknown) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
export const jobSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["analysis", "observation", "ingest", "research"]),
  owner_key: z.string(),
  owner_user_id: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  attempts: z.number(),
  lease_token: z.string().nullable(),
  result_id: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  available_at: z.string().optional(),
});
export type DurableJob = z.infer<typeof jobSchema>;
const situationSchema = z.object({
  id: z.string(),
  identity_key: z.string(),
  owner_key: z.string(),
  owner_user_id: z.string().nullable(),
  title: z.string(),
  is_public: z.boolean(),
  latest_analysis_id: z.string().nullable(),
});
export type Situation = z.infer<typeof situationSchema>;
export class Store {
  constructor(public db: SupabaseClient) {}
  async rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await this.db.rpc(name, args);
    if (error)
      throw Object.assign(new Error(error.message), { code: error.code });
    return data as T;
  }
  async enqueue(
    kind: DurableJob["kind"],
    key: string,
    owner: string,
    userId: string | null,
    payload: Record<string, unknown>,
    ip: string,
  ) {
    const positive = (name: string, fallback: number) => {
      const value = Number(process.env[name]);
      return Number.isInteger(value) && value > 0 ? value : fallback;
    };
    return jobSchema.parse(
      await this.rpc("tether_enqueue", {
        p_kind: kind,
        p_key: key,
        p_owner: owner,
        p_user: userId,
        p_payload: payload,
        p_ip: ip,
        p_user_limit: positive(
          userId ? "ANALYSIS_USER_DAILY_LIMIT" : "ANALYSIS_GUEST_DAILY_LIMIT",
          userId ? 40 : 12,
        ),
        p_ip_limit: positive("ANALYSIS_IP_DAILY_LIMIT", 100),
        p_global_limit: positive("ANALYSIS_GLOBAL_DAILY_LIMIT", 1000),
      }),
    );
  }
  async claim() {
    const data = await this.rpc("tether_claim_job");
    return data ? jobSchema.parse(data) : null;
  }
  async job(id: string, owner: string) {
    const { data, error } = await this.db
      .from("tether_jobs")
      .select("*")
      .eq("id", id)
      .eq("owner_key", owner)
      .maybeSingle();
    if (error) throw error;
    return data ? jobSchema.parse(data) : null;
  }
  async situation(id: string): Promise<Situation | null> {
    const { data, error } = await this.db
      .from("tether_situations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? situationSchema.parse(data) : null;
  }
  async byIdentity(identity: string) {
    const { data, error } = await this.db
      .from("tether_situations")
      .select("*")
      .eq("identity_key", identity)
      .maybeSingle();
    if (error) throw error;
    return data ? situationSchema.parse(data) : null;
  }
  async findReportingSituation(
    source: import("../../src/lib/comparison").EvidenceSource,
  ): Promise<Situation | null> {
    const result = z
      .array(z.object({ situation: situationSchema, analysis: z.unknown() }))
      .parse(await this.rpc("tether_recent_reporting"));
    for (const row of result)
      if (isSameReportingEpisode(source, validateComparison(row.analysis)))
        return row.situation;
    return null;
  }
  async analysis(id: string): Promise<Comparison | null> {
    const { data, error } = await this.db
      .from("tether_analyses")
      .select("payload")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? validateComparison(data.payload) : null;
  }
  async history(situationId: string) {
    const { data, error } = await this.db
      .from("tether_analyses")
      .select("payload")
      .eq("situation_id", situationId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data || []).map((row) => validateComparison(row.payload));
  }
  async publish(
    job: DurableJob,
    analysis: Comparison,
    identityKey: string,
    isPublic = false,
    observation: unknown = null,
  ) {
    validateComparison(analysis);
    const snapshot = {
      fingerprint: hash({
        title: analysis.title,
        sources: analysis.sources.map(
          ({ retrievedAt: _time, ...source }) => source,
        ),
        question: analysis.question,
        observation,
        version: analysis.engineVersion,
        archiveVersion: analysis.archiveVersion,
        research: analysis.research?.id,
      }),
      sources: analysis.sources,
      title: analysis.title,
      context: analysis.context,
      question: analysis.question,
    };
    return this.rpc<string>("tether_publish", {
      p_job: job.id,
      p_lease: job.lease_token,
      p_situation: { identityKey, isPublic },
      p_snapshot: snapshot,
      p_analysis: analysis,
      p_observation: observation,
    });
  }
  async discoveryReadings() {
    const rows = await this.rpc<Array<{ id: string; latest_analysis_id: string }>>("tether_discovery_readings");
    const ids = rows.map(row => row.latest_analysis_id);
    if (!ids.length) return { items: [] };
    const { data, error } = await this.db.from("tether_analyses").select("payload").in("id", ids);
    if (error) throw error;
    const byId = new Map((data || []).map(row => [row.payload.id, row.payload]));
    return { items: ids.flatMap(id => byId.has(id) ? [{ comparison: validateComparison(byId.get(id)) }] : []) };
  }
  /** A bounded showcase pool. This does not consume or skip chronological pages. */
  async discoveryConnections(topic?:NewsTopic) {
    let query=this.db.from('tether_situations').select('id,latest_analysis_id,reported_at')
      .eq('is_public',true).eq('is_walkthrough',false).eq('has_aligned_pair',true)
      .gte('reported_at',new Date(Date.now()-7*86400000).toISOString())
      .order('reported_at',{ascending:false}).order('id',{ascending:false}).limit(240);
    if(topic)query=query.eq('topic',topic);
    const{data:heads,error}=await query;if(error)throw error;
    const ids=(heads||[]).flatMap(h=>h.latest_analysis_id?[h.latest_analysis_id]:[]);
    if(!ids.length)return{items:[]};
    const payloads:Comparison[]=[];
    // Keep each IN query bounded; candidate diversity must not produce a huge URL.
    for(let i=0;i<ids.length;i+=60){
      const{data,error}=await this.db.from('tether_analyses').select('payload').in('id',ids.slice(i,i+60));
      if(error)throw error;for(const row of data||[])payloads.push(validateComparison(row.payload));
    }
    const byId=new Map(payloads.map(c=>[c.id,c]));
    const candidates=discoveryCandidateOrder(ids.flatMap(id=>byId.has(id)?[byId.get(id)!]:[]),24);
    return{items:candidates.map(comparison=>({comparison}))};
  }
  async publicReadings(
    options: {
      topic?: NewsTopic;
      cursor?: { date: string; id: string };
      examples?: boolean;
      connections?: boolean;
    } = {},
  ) {
    let query = this.db
      .from("tether_situations")
      .select("id,latest_analysis_id,reported_at")
      .eq("is_public", true)
      .eq("is_walkthrough", Boolean(options.examples))
      .order("reported_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(21);
    if (options.connections) query = query.eq("has_aligned_pair", true);
    if (options.topic) query = query.eq("topic", options.topic);
    if (options.cursor)
      query = query.or(
        `reported_at.lt.${options.cursor.date},and(reported_at.eq.${options.cursor.date},id.lt.${options.cursor.id})`,
      );
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []).slice(0, 20);
    const last = rows.at(-1);
    const nextCursor =
      (data || []).length > 20 && last
        ? Buffer.from(
            JSON.stringify({ date: last.reported_at, id: last.id }),
          ).toString("base64url")
        : null;
    const ids = rows.flatMap((row) =>
      row.latest_analysis_id ? [row.latest_analysis_id] : [],
    );
    if (!ids.length) return { items: [], nextCursor: null };
    const { data: analyses, error: ae } = await this.db
      .from("tether_analyses")
      .select("payload")
      .in("id", ids);
    if (ae) throw ae;
    const byId = new Map(
      (analyses || []).map((row) => [row.payload.id, row.payload]),
    );
    return {
      items: ids.flatMap((id) =>
        byId.has(id) ? [{ comparison: validateComparison(byId.get(id)) }] : [],
      ),
      nextCursor,
    };
  }
  async reading(userId: string): Promise<ReadingItem[]> {
    const { data, error } = await this.db
      .from("tether_reading")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const rows = await Promise.all(
      (data || []).map(async (row) => {
        const situation = await this.situation(row.situation_id);
        if (!situation) return null;
        const comparison = await this.analysis(
          situation.latest_analysis_id || row.saved_analysis_id,
        );
        if (!comparison) return null;
        const savedComparison = row.saved_analysis_id
          ? row.saved_analysis_id === comparison.id
            ? comparison
            : await this.analysis(row.saved_analysis_id)
          : null;
        return {
          comparison,
          savedComparison,
          savedAnalysisId: row.saved_analysis_id,
          following: row.following,
          saved: Boolean(savedComparison),
          unread: Boolean(
            row.last_read_id && row.last_read_id !== comparison.id,
          ),
        };
      }),
    );
    return rows.filter((row): row is NonNullable<typeof row> => row !== null);
  }
  async cases(): Promise<HistoricalCase[]> {
    // Explicit pagination: the Data API's row cap must not silently remove links.
    const all: HistoricalCase[] = [...reviewedCases, ...canonicalCases];
    const latest = new Set<string>();
    for (let offset = 0; offset < 10000; offset += 200) {
      const data = await this.rpc<Array<{ id: string; payload: unknown }>>(
        "tether_case_page",
        { p_offset: offset, p_limit: 200 },
      );
      let rejected = 0;
      for (const row of data || []) {
        const item = await this.checkedCase(row);
        if (!item) {
          rejected++;
          continue;
        }
        if (latest.has(item.id)) continue;
        latest.add(item.id);
        const index = all.findIndex((existing) => existing.id === item.id);
        if (index < 0) all.push(item);
        else all[index] = item;
      }
      if ((data || []).length < 200) break;
      offset -= rejected;
      if (offset + 200 >= 10000)
        throw new Error(
          "The reviewed archive exceeds the bounded scan. Configure indexed retrieval before expanding further.",
        );
    }
    for (let offset = 0; offset < 10000; offset += 200) {
      const { data, error } = await this.db
        .from("historical_cases")
        .select(
          "id,title,summary,year_label,event_type_slug,structural_summary,outcome_summary,disanalogy_notes,updated_at,historical_case_sources(citation_title,citation_url,publisher,published_at)",
        )
        .order("id")
        .range(offset, offset + 199);
      if (error) throw error;
      for (const row of data || []) {
        const familyMap: Record<
          string,
          {
            family: HistoricalCase["family"];
            signals: HistoricalCase["signals"];
          }
        > = {
          "resource-shock": {
            family: "supply",
            signals: ["supply-dependence", "supply-disruption"],
          },
          "labor-dispute": {
            family: "labor",
            signals: ["collective-bargaining", "work-stoppage"],
          },
          "regulatory-crackdown": {
            family: "regulation",
            signals: ["gatekeeper-control", "enforcement-action"],
          },
          "platform-transition": {
            family: "information",
            signals: ["information-distribution"],
          },
          "distribution-shift": {
            family: "information",
            signals: ["information-distribution"],
          },
          "strategic-competition": {
            family: "conflict",
            signals: ["military-confrontation"],
          },
        };
        const mapping = familyMap[row.event_type_slug] || {
          family: "unknown" as const,
          signals: [],
        };
        // Preserve distinct case IDs. Similar titles are not an identity proof.
        if (all.some((item) => item.id === row.id)) continue;
        const sources = (row.historical_case_sources || [])
          .filter(
            (source) =>
              source.citation_url && /^https?:\/\//.test(source.citation_url),
          )
          .map((source, index) => ({
            id: `${row.id}:source:${index}`,
            title: source.citation_title,
            url: source.citation_url,
            publisher: source.publisher || "Archive reference",
            publishedAt: source.published_at,
            retrievedAt: row.updated_at,
            summary:
              "Reference linked by the existing archive. Passage-level support has not yet been reviewed.",
            kind: "historical-reference" as const,
          }));
        all.push(
          caseSchema.parse({
            id: row.id,
            version: row.updated_at,
            title: row.title,
            period: row.year_label || "Date not established",
            ...mapping,
            initialState: row.structural_summary || row.summary,
            sequence: [],
            outcome: row.outcome_summary,
            boundaries: [
              row.disanalogy_notes ||
                "Institutional conditions, sequence and feasible choices have not been reviewed for transfer to this event.",
            ],
            sources,
            review: "reference-only",
            reviewNote:
              "Imported archive lead. Its taxonomy is a retrieval hint, not independently verified mechanism evidence.",
            narrative: null,
          }),
        );
      }
      if ((data || []).length < 200) break;
      if (offset === 9800)
        throw new Error(
          "The archive exceeds this worker’s bounded scan. Configure indexed retrieval before publishing a complete-coverage claim.",
        );
    }
    return all;
  }
  async forecasts(userId: string, situationId: string): Promise<Forecast[]> {
    const { data, error } = await this.db
      .from("tether_forecasts")
      .select("*,tether_forecast_revisions(*)")
      .eq("user_id", userId)
      .eq("situation_id", situationId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data || []).map((row) =>
      forecastSchema.parse({
        id: row.id,
        situationId: row.situation_id,
        question: row.question,
        criteria: row.criteria,
        resolutionSource: row.resolution_source,
        closesAt: row.closes_at,
        createdAt: row.created_at,
        outcome: row.outcome,
        resolutionNote: row.resolution_note,
        revisions: (
          row.tether_forecast_revisions as Array<{
            id: string;
            probability: number;
            rationale: string;
            created_at: string;
          }>
        )
          .map((revision) => ({
            id: revision.id,
            probability: Number(revision.probability),
            rationale: revision.rationale,
            createdAt: revision.created_at,
          }))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      }),
    );
  }
  async researchLeads(query: string) {
    const noise = new Set(
      "about after before there their which this that what with from into have been will says said today event historical parallel".split(
        " ",
      ),
    );
    const terms = [
      ...new Set(
        (query.toLowerCase().match(/[a-z]{4,}/g) || []).filter(
          (word) => !noise.has(word),
        ),
      ),
    ].slice(0, 14);
    if (!terms.length) return [];
    const data = await this.rpc<Array<{ id: string; payload: unknown }>>(
      "tether_case_page",
      { p_offset: 0, p_limit: 8, p_terms: terms.join(" | ") },
    );
    const result: HistoricalCase[] = [];
    for (const row of data) {
      const item = await this.checkedCase(row);
      if (item) result.push(item);
    }
    return result;
  }
  async checkedCase(row: {
    id: string;
    payload: unknown;
  }): Promise<HistoricalCase | null> {
    try {
      return validateCasePublication(row.payload).historicalCase;
    } catch (error) {
      const reason =
        error instanceof z.ZodError
          ? "Case schema or evidence references failed validation."
          : error instanceof Error
            ? error.message
            : "Case validation failed.";
      const { error: writeError } = await this.db
        .from("tether_case_quarantine")
        .upsert(
          { case_version_id: row.id, reason },
          { onConflict: "case_version_id", ignoreDuplicates: true },
        );
      if (writeError) throw writeError;
      console.warn(
        JSON.stringify({
          event: "case-version-quarantined",
          caseVersionId: row.id,
          reason,
          recorded: !writeError,
        }),
      );
      return null;
    }
  }
}
