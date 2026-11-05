import { build } from "esbuild";
await build({
  entryPoints: ["server.ts", "server/worker.ts", "server/scheduler.ts"],
  bundle: true,
  packages: "external",
  platform: "node",
  target: "node24",
  format: "esm",
  outdir: "build",
  outbase: ".",
  sourcemap: true,
});
