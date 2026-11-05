import dotenv from 'dotenv';import{getSupabaseServerClient}from'../src/lib/supabase/server';import{Store}from'../server/services/store';import{recordResearchGap,enqueueCanonExpansion}from'../server/services/canon-maintenance';import{enqueueCanonChecks}from'../server/services/canon-verification';
dotenv.config({path:'.env.local',override:true,quiet:true});dotenv.config({quiet:true});const store=new Store(getSupabaseServerClient());
if(process.argv.includes('--index-public-gaps')){
 const{data,error}=await store.db.from('tether_situations').select('latest_analysis_id').eq('is_public',true).eq('is_walkthrough',false).eq('has_aligned_pair',false).limit(500);if(error)throw error;let recorded=0;
 for(const head of data||[]){const c=head.latest_analysis_id&&await store.analysis(head.latest_analysis_id);if(c&&await recordResearchGap(store,c))recorded++;}console.log(JSON.stringify({recorded}));
}else if(process.argv.includes('--enqueue'))console.log(JSON.stringify({expansion:await enqueueCanonExpansion(store),checks:await enqueueCanonChecks(store)}));
else throw new Error('Use --index-public-gaps or --enqueue. No model calls are made by this scheduler.');
