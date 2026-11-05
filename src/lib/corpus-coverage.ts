import type {HistoricalCase} from "./comparison";
export const coverageEras=[{id:'ancient',label:'Before 500',before:500},{id:'medieval',label:'500–1499',before:1500},{id:'early-modern',label:'1500–1799',before:1800},{id:'industrial',label:'1800–1944',before:1945},{id:'postwar',label:'1945–1989',before:1990},{id:'recent',label:'1990 onward',before:Infinity}];
export const coverageRegions=[{id:'africa',label:'Sub-Saharan Africa'},{id:'americas',label:'Americas'},{id:'east-asia',label:'East & Southeast Asia'},{id:'south-asia',label:'South Asia'},{id:'west-asia',label:'West Asia & North Africa'},{id:'europe',label:'Europe & Central Asia'},{id:'oceania',label:'Oceania'},{id:'unknown',label:'Unclassified'}];
export function eraFor(year:number|null){return year===null?'unknown':coverageEras.find(era=>year<era.before)!.id;}
export function regionsFor(c:Pick<HistoricalCase,'curation'>){
 const raw=c.curation?.regions||[];const regions=new Set<string>();
 for(const value of raw){
  if(/\b(?:England|Europe|Poland|United Kingdom|Britain|\bUK\b|Greece|Sicily|Austria|Hungary|Soviet Union|Italy|France|Germany)\b/i.test(value))regions.add('europe');
  if(/\b(?:North America|United States|\bUSA?\b|Canada|Brazil|Mexico|South America)\b/i.test(value))regions.add('americas');
  if(/\b(?:Japan|China|Korea|Taiwan|Mongolia|Vietnam|Thailand|Cambodia|Laos|Myanmar|Indonesia|Malaysia|Philippines|Singapore|Southeast Asia)\b/i.test(value))regions.add('east-asia');
  if(/\b(?:India|Pakistan|Bangladesh|Nepal|Sri Lanka|Bhutan|South Asia)\b/i.test(value))regions.add('south-asia');
  if(/\b(?:Egypt|Iran|Iraq|Israel|Palestine|Lebanon|Syria|Jordan|Saudi|Yemen|Oman|Bahrain|Kuwait|Qatar|United Arab Emirates|Turkey|Morocco|Algeria|Tunisia|Libya|Middle East|West Asia|North Africa)\b/i.test(value))regions.add('west-asia');
  if(/\b(?:Australia|Oceania|New Zealand)\b/i.test(value))regions.add('oceania');
  if(/\b(?:Sub-Saharan Africa|South Africa|Nigeria|Kenya|Ethiopia|Ghana|Sudan|Senegal|Zimbabwe|Zambia|Namibia|Tanzania|Mozambique|Congo|Uganda|Rwanda|Mali)\b/i.test(value)||(/\b(?:Africa)\b/i.test(value)&&!/\b(?:North Africa)\b/i.test(value)))regions.add('africa');
 }
 return regions.size?[...regions]:['unknown'];
}
export function corpusCoverage(cases:HistoricalCase[]){
 const entries=cases.filter(c=>(c.episode||c.narrativeRecord)&&['source-checked','web-researched'].includes(c.review)).map(c=>({id:c.id,startYear:c.narrativeRecord?.startYear??c.episode?.startYear??null,endYear:c.narrativeRecord?.endYear??c.episode?.endYear??null,era:eraFor(c.narrativeRecord?.startYear??c.episode?.startYear??null),regions:regionsFor(c.narrativeRecord?.regions.length&&!c.curation?{curation:{edition:'context',regions:c.narrativeRecord.regions,domains:['general'],process:'automated-source-review',independenceNote:'Geographic metadata is not evidence of cultural independence.'}}:c),domains:c.curation?.domains||[],dynamics:c.narrativeRecord?.dynamics?.map(d=>d.dynamic)||c.episode?.symbolic?.dynamics.map(d=>d.dynamic)||[]}));
 return {eras:coverageEras.map(({id,label})=>({id,label})),regions:coverageRegions,entries,unclassifiedDynamics:entries.filter(e=>!e.dynamics.length).length,note:'Geographic groups describe recorded settings, not independent cultures. Empty cells describe this corpus only; symbolic annotation is incomplete.'};
}
export type CorpusCoverage=ReturnType<typeof corpusCoverage>;
