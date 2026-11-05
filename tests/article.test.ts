import test from "node:test";
import assert from "node:assert/strict";
import {
  validateArticleUrl,
  isPublicAddress,
  extractArticle,
} from "../server/services/article";
import { cleanFeedText } from "../server/services/ingestion";
test("publisher excerpts decode nested HTML without exposing markup or scripts", () => {
  assert.equal(
    cleanFeedText("&lt;p&gt;A story &amp;amp; an update.&lt;/p&gt;"),
    "A story & an update.",
  );
  assert.equal(
    cleanFeedText(
      "<script>Unrelated instructions</script><p>Reported fact.</p>",
    ),
    "Reported fact.",
  );
});
test("article ingestion rejects private, alternate notation and unsupported addresses", () => {
  for (const value of [
    "http://127.0.0.1/a",
    "http://2130706433/a",
    "http://[::1]/a",
    "http://[::ffff:127.0.0.1]/a",
    "http://169.254.169.254/a",
    "http://10.0.0.1/a",
    "http://localhost/a",
    "file:///etc/passwd",
    "https://user:password@example.org/a",
    "https://example.org:8080/a",
  ])
    assert.throws(() => validateArticleUrl(value), value);
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("8.8.8.8"), true);
});
test("article extraction uses readable evidence and does not execute instructions", () => {
  const passage =
    "An energy operator reported a disruption to imported gas supplies. Replacement capacity remains limited while buyers seek alternatives. ".repeat(
      3,
    );
  const article = extractArticle(
    `<html><head><title>An energy supply disruption</title></head><body><nav>Unrelated links</nav><script>throw new Error('must not execute')</script><article><h1>Gas supplies interrupted</h1><p>${passage}</p></article></body></html>`,
    new URL("https://example.org/article"),
  );
  assert.ok(article.summary.includes("Replacement capacity"));
  assert.ok(!article.summary.includes("must not execute"));
  assert.equal(article.kind, "reporting");
  assert.throws(() =>
    extractArticle("<p>Too short.</p>", new URL("https://example.org/a")),
  );
  assert.throws(() =>
    extractArticle(
      `<h1>Live updates</h1><p>${passage}</p>`,
      new URL("https://example.org/world/live/2026/a"),
    ),
  );
});

test('article extraction retains a short response and the ending of a long account',()=>{
 const middle='The report describes a long sequence of decisions and reactions by the participants. '.repeat(180);
 const source=extractArticle('<article><h1>A dispute over the future of a public institution</h1><p>The report begins with a contested decision and the people affected by that decision.</p><p>'+middle+'</p><p>We deny the accusation.</p><p>The institution later published its response and agreed to provide records to the inquiry.</p></article>',new URL('https://news.example/story'));
 assert.ok(source.summary.includes('We deny the accusation.'));assert.ok(source.summary.includes('later published its response'));assert.ok(source.readingScope);assert.equal(source.readSegments?.length,2);assert.ok(source.summary.length<=12000);
});
