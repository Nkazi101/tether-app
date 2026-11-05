import dotenv from "dotenv";
import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import {createServer as createHttpServer} from "node:http";
import { z } from "zod";
import { getSupabaseServerClient } from "./src/lib/supabase/server";
import { createLivingApi } from "./server/api";
import { createAccountApi } from "./server/account-api";
import { InputError } from "./server/services/article";

dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
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
  return app;
}
export async function startServer() {
  const app = createApp();
  const httpServer = createHttpServer(app);
  let developmentServer: import("vite").ViteDevServer | null = null;
  if (process.env.NODE_ENV === "production") {
    const dist = path.resolve("dist");
    app.use(express.static(dist, { index: false }));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr:
          process.env.DISABLE_HMR === "true"
            ? false
            : { server: httpServer },
      },
      appType: "spa",
    });
    developmentServer = vite;
    app.use(vite.middlewares);
  }
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
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be a valid TCP port.");
  const server = httpServer.listen(port, process.env.BIND_HOST || "0.0.0.0", () =>
    console.info(`Tether listening on port ${port}`),
  );
  server.on("error", (error) => {
    console.error(
      JSON.stringify({
        event: "server-start-failed",
        code: (error as NodeJS.ErrnoException).code,
      }),
    );
    process.exitCode = 1;
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => process.exit(1), 10000).unref();
    const closed = new Promise<void>(resolve => { server.close(() => resolve()); server.closeIdleConnections(); });
    void Promise.all([closed,developmentServer?.close()]).then(()=>{clearTimeout(deadline);process.exit(0);}).catch(()=>process.exit(1));
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  return server;
}
if (!process.env.TETHER_IMPORT_ONLY)
  void startServer().catch(() => {
    console.error(
      "Tether could not start. Check the runtime and configuration.",
    );
    process.exitCode = 1;
  });
