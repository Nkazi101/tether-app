import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import {createServer as createHttpServer} from "node:http";
import { createApp } from "./server/app";

export { createApp } from "./server/app";

dotenv.config({ path: ".env.local", override: true, quiet: true });
dotenv.config({ quiet: true });
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
