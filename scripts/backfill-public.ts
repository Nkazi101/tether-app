import dotenv from 'dotenv';import{getSupabaseServerClient}from'../src/lib/supabase/server';import{Store}from'../server/services/store';import{enqueuePublicBackfill}from'../server/services/public-backfill';
dotenv.config({path:'.env.local',override:true,quiet:true});dotenv.config({quiet:true});
const store=new Store(getSupabaseServerClient());
if(process.argv[2]==='--enqueue'){const limit=Number(process.argv.find(a=>a.startsWith('--limit='))?.slice(8)||12);if(!Number.isInteger(limit)||limit<1||limit>200)throw new Error('Choose 1–200 public jobs.');console.log(JSON.stringify(await enqueuePublicBackfill(store,limit)));}
else if(process.argv[2]==='--status')console.log(JSON.stringify(await store.rpc('tether_public_research_coverage'),null,2));
else throw new Error('Use --enqueue [--limit=12] or --status.');
