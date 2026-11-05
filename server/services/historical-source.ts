import { Worker } from "node:worker_threads";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import type { EvidenceSource } from "../../src/lib/comparison";
import { readPage, validateArticleUrl, InputError } from "./article";

export {boundedSourceText as historicalExcerpt} from '../domain/bounded-source-text';
import {boundedSourceText,sourceExcerptMetadata,omissionMarker} from '../domain/bounded-source-text';
/** Parse untrusted PDFs off the server/worker event loop, with CPU and heap limits. */
export async function historicalPdfText(data: Uint8Array): Promise<string> {
  if (data.byteLength > 6_000_000 || Buffer.from(data.subarray(0, 5)).toString() !== "%PDF-") throw new InputError("Unsupported historical PDF.", 422);
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const {parentPort,workerData}=require('node:worker_threads');
      (async()=>{
        const {getDocumentProxy}=await import('unpdf');
        const doc=await getDocumentProxy(new Uint8Array(workerData),{isEvalSupported:false,disableFontFace:true,useSystemFonts:false,verbosity:0});
        let text='';
        for(let n=1;n<=Math.min(doc.numPages,40)&&text.length<48000;n++){
          const page=await doc.getPage(n);const content=await page.getTextContent();
          text+=content.items.filter(i=>'str' in i).map(i=>i.str+(i.hasEOL?'\\n':'')).join('')+'\\n';
          page.cleanup();
        }
        if(doc.loadingTask)await doc.loadingTask.destroy();parentPort.postMessage(text.slice(0,48000));
      })().catch(e=>parentPort.postMessage({error:String(e.message).slice(0,200)}));`, { eval: true, workerData: data, resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 } });
    const finish = (text: string | null) => { clearTimeout(timer); void worker.terminate(); text && text.trim().length >= 200 ? resolve(boundedSourceText(text)) : reject(new InputError("The historical PDF has insufficient accessible text.", 422)); };
    const timer = setTimeout(() => finish(null), 12000);
    worker.once("message", value => { if (typeof value !== "string") console.warn(JSON.stringify({event:"historical-pdf-error",message:value?.error})); finish(typeof value === "string" ? value : null); }); worker.once("error", error => { console.warn(JSON.stringify({event:"historical-pdf-error",message:error.message})); finish(null); }); worker.once("exit", code => { if (code) finish(null); });
  });
}
export function historicalHtmlText(html: string): { title: string; text: string } {
  const $ = load(html);
  let title = ($('meta[property="og:title"]').attr("content") || $("h1").first().text() || $("title").text()).replace(/\s+/g, " ").trim();
  $('script,style,nav,footer,header,aside,form,noscript,[role="navigation"],[aria-hidden="true"],.reflist,.mw-references-wrap,.references').remove();
  if (title.length < 8) title = $("h1,h2,h3").first().text().trim() || $("body").text().replace(/\s+/g," ").trim().slice(0,100);
  if (/checking your browser|just a moment|access denied|verify you are human/i.test(title)) throw new InputError("The archive requires browser access.",422);
  const roots = $("article,main,[role=main],.entry-content,.field--name-body").toArray().sort((a,b)=>$(b).text().length-$(a).text().length);
  const root = roots.length ? $(roots[0]) : $("body");
  // Archival transcripts often use tables, list items or blockquotes rather than article paragraphs.
  // Older archival transcriptions sometimes put the entire prose in heading or
  // preformatted elements. Do not retain only their modern citation paragraphs.
  let text = root.find("p,li,blockquote,td,h2,h3,h4,h5,h6,pre").toArray()
    .filter(n => !$(n).children("p,li,blockquote,td,h2,h3,h4,h5,h6,pre,table,ul,ol").length)
    .map(n => ({text:$(n).text().replace(/\s+/g," ").trim(),heading:/^h[2-6]$/.test(n.tagName)}))
    .filter(item => item.text.length >= (item.heading?2:20)).map(item=>item.text).join("\n");
  if (text.length < 200) text = root.text().replace(/\s+/g," ").trim();
  if (title.length < 8 || text.length < 200) throw new InputError("The archive has insufficient accessible text.",422);
  return { title: title.slice(0,300), text: boundedSourceText(text) };
}
export async function fetchHistoricalSource(input: string): Promise<EvidenceSource> {
  const page = await readPage(validateArticleUrl(input),0,true);
  const document = page.pdf ? { title: decodeURIComponent(page.url.pathname.split('/').at(-1) || "Historical document"), text: await historicalPdfText(new Uint8Array(page.pdf)) } : historicalHtmlText(page.html);
  return { id: `history:${createHash("sha256").update(page.url.href+document.text).digest("hex").slice(0,24)}`, title: document.title, url: page.url.href, publisher: page.url.hostname.replace(/^www\./,""), publishedAt:null, retrievedAt:new Date().toISOString(), summary:document.text,...sourceExcerptMetadata(document.text),...(page.pdf?{readingScope:'Bounded PDF extraction: at most the first 40 pages were examined; long extracts retain the opening and ending.'}:{}), kind:"historical-reference",retrieval:"source-page" };
}
