import {Agent} from 'undici';

// Keep the model connection pool separate from source retrieval. On the current
// provider, long HTTP/2 completions shared one session and queued behind each
// other. Explicit HTTP/1.1 connections avoid that head-of-line delay without
// changing the model allowance or disabling certificate verification.
const modelDispatcher=new Agent({allowH2:false,connections:32,headersTimeout:420000,bodyTimeout:420000});
export const modelFetch:typeof fetch=(input,init)=>fetch(input,{...init,dispatcher:modelDispatcher} as RequestInit);
