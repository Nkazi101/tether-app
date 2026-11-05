import test from 'node:test';import assert from 'node:assert/strict';
import {historicalHtmlText,historicalPdfText} from '../server/services/historical-source';
function pdf(text:string,fragments=false){
 // Real PDF text is laid out on the page; a single long line is clipped.
 const lines=text.match(/.{1,72}(?:\s|$)/g) || [text];
 const fragmented="BT /F1 12 Tf 50 700 Td (The fi) Tj /F2 12 Tf (lm) Tj /F1 12 Tf ( was shown in the college of) Tj /F2 12 Tf (fi) Tj /F1 12 Tf (ce. The rest of this original account describes the programme and the audience reaction to its presentation.) Tj 0 -20 Td (The source contains enough historical prose to examine, rather than a single catalogue label or citation that would not establish the event.) Tj ET";
 const content=fragments?fragmented:`BT /F1 12 Tf 50 700 Td 16 TL ${lines.map((line,i)=>`${i?'T* ':''}(${line.trim()}) Tj`).join(' ')} ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
 objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>');
 let out='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const start=Buffer.byteLength(out);out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return new Uint8Array(Buffer.from(out));
}
test('historical transcripts in tables remain readable without an article template',()=>{
 const text='The commission examined the warning, the decision and the evidence recorded in the hearing. '.repeat(4);
 const result=historicalHtmlText(`<html><body><h2>Commission historical evidence</h2><table><tr><td>${text}</td></tr></table><script>untrusted()</script></body></html>`);
 assert.ok(result.text.includes('commission examined'));assert.ok(!result.text.includes('untrusted'));assert.throws(()=>historicalHtmlText('<title>Checking your browser</title><body>'+text+'</body>'),/browser access/);
});
test('bounded PDF extraction reads real text and rejects non-PDF input',async()=>{
 const text='This is a synthetic archive fixture. The committee recorded a warning before the decision and published the result afterward. '.repeat(3);
 const extracted=await historicalPdfText(pdf(text));assert.ok(extracted.includes('committee recorded a warning'));assert.ok(extracted.length<=12000);
 await assert.rejects(()=>historicalPdfText(new Uint8Array(Buffer.from('not a PDF'))),/Unsupported historical PDF/);
});

test('a bounded long source retains the ending instead of only the opening',()=>{
 const middle='A long intermediate account with no final result. '.repeat(700);
 const html='<article><h1>A documented historical episode</h1><p>The opening states the original dispute and its setting.</p><p>'+middle+'</p><p>The commission finally withdrew the order and published its decision in the following year.</p></article>';
 const {text}=historicalHtmlText(html);assert.ok(text.includes('opening states'));assert.ok(text.includes('commission finally withdrew'));assert.ok(text.includes('Middle of this source omitted'));assert.ok(text.length<=12000);
});

test('older heading-formatted transcriptions retain the historical account alongside citations',()=>{
 const account='I examined the houses supplied by the company and compared the water each household received before drawing a conclusion about the outbreak.';
 const result=historicalHtmlText(`<html><head><title>An original historical investigation</title></head><body><h5>${account}</h5><p>Map citation and modern catalogue information for the reproduced historical document.</p><h6>The subsequent inquiry records how the water supply differed between the affected and unaffected households.</h6></body></html>`);
 assert.ok(result.text.includes(account));assert.ok(result.text.includes('subsequent inquiry'));assert.equal(result.text.split(account).length,2);
});


test('short author credits survive historical extraction for source-origin checking',()=>{
 const credit='Text - Gerald Donaldson';const {text}=historicalHtmlText(`<html><head><title>A credited original historical account</title></head><body><main><p>${credit}</p><p>The historical account records a dismissal, a year outside the competition, and a return under a different employer in the following season.</p><p>Independent contemporaneous records establish the results described in this retrospective account.</p></main></body></html>`);
 assert.ok(text.includes(credit));
});


test('PDF font-run fragments do not insert spaces inside words',async()=>{
 const text=await historicalPdfText(pdf('',true));
 assert.ok(text.includes('The film'),text);assert.ok(text.includes('college office'),text);assert.ok(!text.includes('fi lm'),text);
});


test('short timeline headings keep the date context of an archival account',()=>{
 const {text}=historicalHtmlText('<html><head><title>A dated historical investigation</title></head><body><main><h2>1854</h2><p>The original inquiry compared different water supplies and recorded the distribution of the reported deaths.</p><h2>1855</h2><p>The subsequent account described the findings, remaining uncertainty and response to the earlier outbreak.</p></main></body></html>');assert.ok(text.includes('1854\nThe original inquiry'));assert.ok(text.includes('1855\nThe subsequent account'));
});
