import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import viteConfig from "../vite.config";

test("the Vercel handler serves API responses and applies JSON errors without starting its own server", async () => {
  const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL", "TRUST_PROXY_HOPS"];
  const previous = names.map(name => process.env[name]);
  for (const name of names) delete process.env[name];
  process.env.VERCEL = "1";
  try {
    const { default: app } = await import("../api/index");
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const live = await fetch(`${base}/api/health/live`);
      assert.equal(live.status, 200);
      assert.deepEqual(await live.json(), { status: "alive" });
      const ready = await fetch(`${base}/api/health/ready`);
      assert.equal(ready.status, 503);
      assert.equal((await ready.json()).reason, "Evidence store is not configured.");
      const unavailable = await fetch(`${base}/api/me`);
      assert.equal(unavailable.status, 503);
      assert.deepEqual(await unavailable.json(), { error: "The account store is not configured." });
      const headers = { "Content-Type": "application/json", "X-Forwarded-Proto": "https", Origin: base.replace("http:", "https:") };
      const malformed = await fetch(`${base}/api/requests`, { method: "POST", headers, body: "{" });
      assert.equal(malformed.status, 400);
      assert.equal((await malformed.json()).error, "Send a valid JSON request without compression.");
      const sameOrigin = await fetch(`${base}/api/requests`, { method: "POST", headers, body: "{}" });
      assert.equal(sameOrigin.status, 404);
      const foreignOrigin = await fetch(`${base}/api/requests`, { method: "POST", headers: { ...headers, Origin: "https://another.example" }, body: "{}" });
      assert.equal(foreignOrigin.status, 403);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  } finally {
    names.forEach((name, index) => previous[index] === undefined ? delete process.env[name] : process.env[name] = previous[index]);
  }
});

test("Vercel integration settings supply browser credentials without exposing server secrets", async () => {
  const settings: Record<string, string> = {
    VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "",
    SUPABASE_URL: "https://integration.example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-browser-key",
    SUPABASE_ANON_KEY: "legacy-public-key",
    NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "server-service-secret-must-not-be-public",
    SUPABASE_SECRET_KEY: "sb_secret_must-not-be-public",
  };
  const previous = new Map(Object.keys(settings).map(name => [name, process.env[name]]));
  Object.assign(process.env, settings);
  assert.equal(typeof viteConfig, "function");
  const config = viteConfig as (environment: { mode: string; command: "build" }) => { define?: Record<string, string> };
  try {
    const integrated = await config({ mode: "production", command: "build" });
    assert.equal(integrated.define?.["import.meta.env.VITE_SUPABASE_URL"], JSON.stringify(settings.SUPABASE_URL));
    assert.equal(integrated.define?.["import.meta.env.VITE_SUPABASE_ANON_KEY"], JSON.stringify(settings.SUPABASE_PUBLISHABLE_KEY));
    assert.ok(!JSON.stringify(integrated.define).includes(settings.SUPABASE_SERVICE_ROLE_KEY));
    assert.ok(!JSON.stringify(integrated.define).includes(settings.SUPABASE_SECRET_KEY));
    process.env.VITE_SUPABASE_URL = "https://explicit.example.supabase.co";
    process.env.VITE_SUPABASE_ANON_KEY = "explicit-public-key";
    const explicit = await config({ mode: "production", command: "build" });
    assert.equal(explicit.define?.["import.meta.env.VITE_SUPABASE_URL"], JSON.stringify(process.env.VITE_SUPABASE_URL));
    assert.equal(explicit.define?.["import.meta.env.VITE_SUPABASE_ANON_KEY"], JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY));
  } finally {
    for (const [name, value] of previous) value === undefined ? delete process.env[name] : process.env[name] = value;
  }
});
