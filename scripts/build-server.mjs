import { build } from "esbuild";
await build({
  entryPoints: ["server.ts", "server/worker.ts", "server/scheduler.ts", "server/vercel.ts"],
  bundle: true,
  packages: "external",
  platform: "node",
  target: "node24",
  format: "esm",
  outdir: "build",
  outbase: ".",
  sourcemap: true,
});

// Verify native Node resolution, which TypeScript loaders can otherwise mask.
const { default: vercelApp } = await import("../api/index.js");
if (typeof vercelApp !== "function") {
  throw new Error("The Vercel API build must export an HTTP handler.");
}
