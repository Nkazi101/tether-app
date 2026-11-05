import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { InputError } from "./services/article";
import { Store } from "./services/store";
export function createAccountApi(db: SupabaseClient | null) {
  const api = Router();
  const route =
    (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => {
      fn(req, res).catch(next);
    };
  async function user(req: Request) {
    if (!db) throw new InputError("The account store is not configured.", 503);
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new InputError("Sign in to continue.", 401);
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user)
      throw new InputError("Sign in again to continue.", 401);
    return data.user;
  }
  api.get(
    "/me",
    route(async (req, res) => {
      const identity = await user(req);
      const [profile, preferences] = await Promise.all([
        db!.from("profiles").select("role").eq("id", identity.id).maybeSingle(),
        db!
          .from("user_preferences")
          .select("event_archetype_slugs,preferred_domains,analysis_depth")
          .eq("user_id", identity.id)
          .maybeSingle(),
      ]);
      if (profile.error || preferences.error)
        throw profile.error || preferences.error;
      return res.json({
        userId: identity.id,
        role: profile.data?.role || "user",
        preferences: preferences.data || {
          event_archetype_slugs: [],
          preferred_domains: [],
          analysis_depth: "balanced",
        },
      });
    }),
  );
  api.put(
    "/preferences",
    route(async (req, res) => {
      const identity = await user(req);
      const input = z
        .object({
          eventArchetypeSlugs: z.array(z.string().max(64)).max(12),
          preferredDomains: z.array(z.string().max(64)).max(12).default([]),
          analysisDepth: z
            .enum(["quick", "balanced", "deep"])
            .default("balanced"),
        })
        .strict()
        .parse(req.body);
      const { data, error } = await db!
        .from("user_preferences")
        .upsert(
          {
            user_id: identity.id,
            event_archetype_slugs: input.eventArchetypeSlugs,
            preferred_domains: input.preferredDomains,
            analysis_depth: input.analysisDepth,
          },
          { onConflict: "user_id" },
        )
        .select("event_archetype_slugs,preferred_domains,analysis_depth")
        .single();
      if (error) throw error;
      return res.json({ preferences: data });
    }),
  );
  api.get(
    "/curations",
    route(async (req, res) => {
      const identity = await user(req);
      const { data, error } = await db!
        .from("curations")
        .select(
          "id,modern_title,historical_title,modern_event,historical_event,description,created_at",
        )
        .eq("owner_subject", `supabase:${identity.id}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return res.json({
        curations: (data || []).map((row) => ({
          id: row.id,
          modernTitle: row.modern_title,
          historicalTitle: row.historical_title,
          modernEvent: row.modern_event,
          historicalEvent: row.historical_event,
          description: row.description,
          createdAt: row.created_at,
        })),
      });
    }),
  );
  api.delete(
    "/curations/:id",
    route(async (req, res) => {
      const identity = await user(req);
      const id = z.string().uuid().parse(req.params.id);
      const { data, error } = await db!
        .from("curations")
        .delete()
        .eq("id", id)
        .eq("owner_subject", `supabase:${identity.id}`)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new InputError("This bookmark was not found.", 404);
      return res.json({ deleted: true });
    }),
  );
  api.post(
    "/operations/ingest",
    route(async (req, res) => {
      const identity = await user(req);
      const { data, error } = await db!
        .from("profiles")
        .select("role")
        .eq("id", identity.id)
        .single();
      if (error) throw error;
      if (data.role !== "admin")
        throw new InputError("Administrator access required.", 403);
      await new Store(db!).rpc("tether_enqueue", {
        p_kind: "ingest",
        p_key: `manual:${Math.floor(Date.now() / 60000)}`,
        p_owner: "system:scheduler",
        p_user: null,
        p_payload: {},
        p_ip: "scheduler",
        p_user_limit: 24,
        p_ip_limit: 24,
        p_global_limit: 5000,
      });
      return res.status(202).json({ queued: true });
    }),
  );
  return api;
}
