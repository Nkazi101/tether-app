import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeImageUrl,
  imageFromFeed,
  storyImageSchema,
} from "../src/lib/story-media";
import { extractArticle } from "../server/services/article";
import { canonicalReportingUrl } from "../server/services/ingestion";

test("publisher imagery cannot embed arbitrary hosts or credentials", () => {
  for (const url of [
    "http://ichef.bbci.co.uk/a.jpg",
    "https://127.0.0.1/a.jpg",
    "https://localhost/a.jpg",
    "https://ichef.bbci.co.uk.evil.example/a.jpg",
    "https://user:pass@ichef.bbci.co.uk/a.jpg",
    "https://ichef.bbci.co.uk:444/a.jpg",
    "data:image/svg+xml,a",
    "https://unknown.example/a.jpg",
    "https://ichef.bbci.co.uk/logo.jpg",
  ])
    assert.equal(safeImageUrl(url), null, url);
  assert.equal(
    safeImageUrl("https://media.guim.co.uk/a.jpg?width=700&amp;quality=85"),
    "https://media.guim.co.uk/a.jpg?width=700&quality=85",
  );
  assert.equal(
    storyImageSchema.safeParse({
      url: "https://127.0.0.1/a",
      alt: "a",
      credit: "a",
      sourceUrl: "https://example.com",
      kind: "article",
    }).success,
    false,
  );
});
test("RSS chooses the largest image, preserves photographer credit and decodes entities", () => {
  const item = {
    "media:content": [
      { "@_width": "140", "@_url": "https://i.guim.co.uk/a.jpg?width=140" },
      {
        "@_width": "700",
        "@_url": "https://i.guim.co.uk/a.jpg?width=700&amp;quality=85",
        "media:credit": { "#text": "Photograph: A. Example" },
      },
    ],
  };
  const image = imageFromFeed(
    item,
    "A story",
    "The Guardian",
    "https://www.theguardian.com/a",
  );
  assert.equal(image?.url, "https://i.guim.co.uk/a.jpg?width=700&quality=85");
  assert.match(image!.credit, /A\. Example/);
  assert.equal(image!.kind, "article");
  assert.equal(
    imageFromFeed(
      { "media:thumbnail": { "@_url": "https://private.example/a" } },
      "a",
      "BBC",
      "https://bbc.co.uk/a",
    ),
    undefined,
  );
  assert.match(
    imageFromFeed(
      {
        "media:thumbnail": {
          "@_url": "https://ichef.bbci.co.uk/ace/standard/240/a.jpg",
        },
      },
      "a",
      "BBC",
      "https://bbc.co.uk/a",
    )!.url,
    /standard\/1024/,
  );
});
test("legacy double-encoded campaign parameters do not break photo lookup", () => {
  assert.equal(
    canonicalReportingUrl(
      "https://www.bbc.co.uk/a?amp%3Bat_campaign=rss&utm_source=feed#section",
    ),
    "https://www.bbc.co.uk/a",
  );
  assert.equal(
    canonicalReportingUrl(
      "https://www.bbc.co.uk/a?at_medium=RSS&amp;at_campaign=rss",
    ),
    "https://www.bbc.co.uk/a",
  );
});
test("article extraction retains only safe publisher imagery without changing evidence text", () => {
  const paragraph =
    "This article describes a reported event with enough accessible context for the historical investigation. ".repeat(
      4,
    );
  const html = `<html><head><meta property="og:title" content="An example current event"><meta property="og:image" content="https://ichef.bbci.co.uk/a.jpg"><meta property="og:image:alt" content="The publisher’s description"></head><body><article><figcaption><p>A photograph caption should not become the article lead.</p></figcaption><p>${paragraph}</p></article></body></html>`;
  const source = extractArticle(html, new URL("https://www.bbc.co.uk/news/a"));
  assert.equal(source.image?.url, "https://ichef.bbci.co.uk/a.jpg");
  assert.equal(source.image?.alt, "The publisher’s description");
  assert.equal(source.summary, paragraph.trim());
  assert.equal(
    extractArticle(
      html.replace(
        "https://ichef.bbci.co.uk/a.jpg",
        "http://127.0.0.1/private",
      ),
      new URL("https://www.bbc.co.uk/news/a"),
    ).image,
    undefined,
  );
});
