import {boundedSourceText,sourceExcerptMetadata} from '../domain/bounded-source-text';
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
import { createHash } from "node:crypto";
import type { EvidenceSource } from "../../src/lib/comparison";
import { safeImageUrl } from "../../src/lib/story-media";

export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function isPublicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
export function validateArticleUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InputError("Use a complete http or https article URL.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new InputError("This URL is not a public article address.");
  if (
    /^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i.test(url.hostname) ||
    (!url.hostname.includes(".") && !url.hostname.includes(":"))
  )
    throw new InputError(
      "Local and private network addresses cannot be opened.",
    );
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (ipaddr.isValid(host) && !isPublicAddress(host))
    throw new InputError(
      "Local and private network addresses cannot be opened.",
    );
  url.hash = "";
  return url;
}
export async function publicAddresses(url: URL) {
  const addresses = await Promise.race([
    lookup(url.hostname.replace(/^\[|\]$/g, ""), { all: true }),
    new Promise<never>((_resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new InputError(
              "The publisher address could not be resolved promptly. Paste the relevant text instead.",
              422,
            ),
          ),
        5000,
      );
      timer.unref();
    }),
  ]);
  if (
    !addresses.length ||
    addresses.some((item) => !isPublicAddress(item.address))
  )
    throw new InputError(
      "This address resolves to a private or unsupported network.",
    );
  return addresses;
}
export async function readPage(
  url: URL,
  redirects = 0,
  historical = false,
): Promise<{ html: string; url: URL; pdf?: Buffer }> {
  if (redirects > 3)
    throw new InputError(
      "The article redirects too many times. Paste the relevant text instead.",
    );
  const addresses = await publicAddresses(url);
  const address = addresses[0];
  // Pin the validated DNS result to the connection. A second lookup must not
  // permit rebinding to localhost or a cloud metadata endpoint.
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": "Tether/1.0 (article context)",
          Accept: historical ? "text/html,application/pdf" : "text/html",
          "Accept-Encoding": "identity",
        },
        family: address.family,
        lookup: (_host, _options, callback) =>
          callback(null, address.address, address.family),
        signal: AbortSignal.timeout(12000),
        maxHeaderSize: 16384,
      },
      (response) => {
        if (
          response.statusCode &&
          [301, 302, 303, 307, 308].includes(response.statusCode)
        ) {
          response.resume();
          if (!response.headers.location)
            return reject(
              new InputError("The article returned an incomplete redirect."),
            );
          let next: URL;
          try {
            next = validateArticleUrl(
              new URL(response.headers.location, url).href,
            );
          } catch (error) {
            reject(error);
            return;
          }
          readPage(next, redirects + 1, historical).then(resolve, reject);
          return;
        }
        if (
          response.statusCode !== 200 ||
          !(response.headers["content-type"]?.includes("text/html") || (historical && response.headers["content-type"]?.includes("application/pdf"))) ||
          (response.headers["content-encoding"] &&
            response.headers["content-encoding"] !== "identity")
        ) {
          response.resume();
          reject(
            new InputError(
              "The publisher could not provide readable article text. Paste the relevant passage instead.",
              422,
            ),
          );
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > (historical ? (response.headers["content-type"]?.includes("application/pdf") ? 6_000_000 : 2_000_000) : 600_000)) {
            request.destroy(
              new InputError(
                "The page is too large. Paste the relevant passage instead.",
                422,
              ),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve(response.headers["content-type"]?.includes("application/pdf") ? { html: "", pdf: Buffer.concat(chunks), url } : { html: Buffer.concat(chunks).toString("utf8"), url }),
        );
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    request.end();
  });
}
export function extractArticle(html: string, url: URL): EvidenceSource {
  const $ = load(html);
  const clean = (value: string) => value.replace(/\s+/g, " ").trim();
  const title = clean(
    $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text() ||
      $("title").text(),
  ).slice(0, 300);
  const date =
    $('meta[property="article:published_time"]').attr("content") ||
    $("time[datetime]").first().attr("datetime");
  const imageUrl = safeImageUrl(
    $('meta[property="og:image:secure_url"]').attr("content") ||
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content"),
    url.href,
  );
  const imageAlt = clean(
    $('meta[property="og:image:alt"]').attr("content") ||
      `Image accompanying “${title}”`,
  ).slice(0, 600);
  const captions=$('article figcaption,[data-component="caption-block"]').toArray().map(node=>clean($(node).text()).slice(0,1000)).filter(text=>text.length>=20).slice(0,5);
  $(
    'script,style,nav,footer,header,aside,form,noscript,figcaption,[data-component="caption-block"],[role="navigation"],[aria-hidden="true"]',
  ).remove();
  const root = $("article").first().length
    ? $("article").first()
    : $("main").first();
  const summary = boundedSourceText((root.length ? root : $("body"))
    .find("p")
    .toArray()
    .map((node) => clean($(node).text()))
    .filter((value) => value.length >= 20)
    .join("\n"));
  if (title.length < 8 || summary.length < 200)
    throw new InputError(
      "There is not enough accessible article text. Paste the relevant passage instead.",
      422,
    );
  if (/\/(?:live|liveblog)\//i.test(url.pathname))
    throw new InputError(
      "This is a live blog with several events. Paste the specific update you want to compare.",
      422,
    );
  return {
    id: `article:${createHash("sha256")
      .update(url.href + summary)
      .digest("hex")
      .slice(0, 24)}`,
    title,
    url: url.href,
    publisher: url.hostname.replace(/^www\./, ""),
    publishedAt:
      date &&
      Number.isFinite(Date.parse(date)) &&
      Date.parse(date) <= Date.now() + 3600000
        ? new Date(date).toISOString()
        : null,
    retrievedAt: new Date().toISOString(),
    summary,
    ...sourceExcerptMetadata(summary),
    ...(captions.length?{captions}:{}),
    kind: "reporting",
    retrieval: "article-text",
    ...(imageUrl
      ? {
          image: {
            url: imageUrl,
            alt: imageAlt,
            credit: url.hostname.replace(/^www\./, ""),
            sourceUrl: url.href,
            kind: "article" as const,
          },
        }
      : {}),
  };
}
export async function fetchArticle(input: string): Promise<EvidenceSource> {
  try {
    const page = await readPage(validateArticleUrl(input));
    return extractArticle(page.html, page.url);
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError(
      "The article could not be read within the time limit. Paste its relevant text instead.",
      422,
    );
  }
}
