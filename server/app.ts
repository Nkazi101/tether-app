import express, { type ErrorRequestHandler } from "express";
import { z } from "zod";
import { getSupabaseServerClient } from "../src/lib/supabase/server";
import { createLivingApi } from "./api";
import { createAccountApi } from "./account-api";
import { InputError } from "./services/article";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || (process.env.VERCEL ? 1 : 0));
  if (Number.isInteger(proxyHops) && proxyHops > 0 && proxyHops <= 3)
    app.set("trust proxy", proxyHops);
  app.use(express.json({ limit: "32kb", strict: true, inflate: false }));
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    next();
  });
  const db =
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? getSupabaseServerClient()
      : null;
  app.use("/api", createLivingApi(db));
  app.use("/api", createAccountApi(db));
  app.use("/api", (_req, res) =>
    res.status(404).json({
      error:
        "This endpoint is unavailable. Open Explore for historical comparisons.",
    }),
  );
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    res.setHeader("Cache-Control", "no-store");
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: error.issues[0]?.message || "Check the request fields.",
      });
      return;
    }
    if (error instanceof InputError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error?.type === "entity.too.large") {
      res.status(413).json({ error: "This request is too large." });
      return;
    }
    if (
      error instanceof SyntaxError ||
      error?.type === "encoding.unsupported"
    ) {
      res
        .status(400)
        .json({ error: "Send a valid JSON request without compression." });
      return;
    }
    console.error(
      JSON.stringify({
        event: "request-failed",
        code: error?.code || "internal",
      }),
    );
    res.status(503).json({ error: "This service is temporarily unavailable." });
  };
  app.use(errors);
  return app;
}
