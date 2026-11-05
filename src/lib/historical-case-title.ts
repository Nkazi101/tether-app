import type{HistoricalCase}from'./comparison';
const titles:Record<string,string>={
 'canon:magna-carta-1215':'King John, the barons and Magna Carta',
 'canon:oil-embargo-1973':'The 1973 Arab oil embargo',
 'canon:bank-holiday-1933':'Roosevelt’s nationwide bank holiday',
 'canon:montgomery-boycott-1955':'The Montgomery bus boycott',
 'canon:gdansk-solidarity-1980':'The Gdańsk shipyard strike and Solidarity',
 'canon:pjs-privacy-2016':'PJS v News Group Newspapers: the privacy injunction',
 'canon:best-buy-reorganisation-2013':'Best Buy’s job cuts and remote-work reversal',
 'canon:athens-sicily-415':'Athens debates the Sicilian expedition',
 'canon:semmelweis-handwashing-1847':'Semmelweis and handwashing in Vienna',
 'canon:minamata-investigation-1956':'The investigation of Minamata disease',
 'canon:salt-march-1930':'Gandhi’s Salt March',
 'canon:moscow-olympic-boycott-1980':'The US boycott of the Moscow Olympics',
 'canon:prost-ferrari-1991':'Alain Prost’s dismissal from Ferrari',
 'canon:reno-aclu-1997':'Reno v ACLU: the internet speech challenge',
};
const legacyTitles:Record<string,string>={
 "canon:magna-carta-1215": "Rebellion, negotiation and the first Magna Carta",
 "canon:oil-embargo-1973": "Oil exporters restrict supply to gain diplomatic leverage",
 "canon:bank-holiday-1933": "A bank run is interrupted by a nationwide closure",
 "canon:montgomery-boycott-1955": "A transport boycott combines economic pressure with a court challenge",
 "canon:gdansk-solidarity-1980": "Striking workers insist on organisation rights beyond a pay offer",
 "canon:pjs-privacy-2016": "A celebrity’s appeal preserves anonymity while privacy is contested",
 "canon:best-buy-reorganisation-2013": "Cost cutting is followed by tighter control of remote work",
 "canon:athens-sicily-415": "A warning about an expedition is answered with a larger commitment",
 "canon:semmelweis-handwashing-1847": "Comparing wards leads to a change in clinical practice",
 "canon:minamata-investigation-1956": "Evidence of industrial harm emerges before official recognition",
 "canon:salt-march-1930": "An everyday commodity becomes the focus of civil disobedience",
 "canon:moscow-olympic-boycott-1980": "Government pressure reaches athletes through a formally separate committee",
 "canon:prost-ferrari-1991": "A public dispute ends with a driver losing the seat",
 "canon:reno-aclu-1997": "A child-protection law meets a constitutional speech challenge"
};
/** A specific case name for readers; the underlying immutable record is unchanged. */
export const historicalCaseTitle=(c:Pick<HistoricalCase,'id'|'title'>)=>c.title===legacyTitles[c.id]?(titles[c.id]||c.title):c.title;

export function historicalCasePeriod(c:Pick<HistoricalCase,'period'|'narrativeRecord'>){
 const h=c.narrativeRecord;if(!h||h.startYear===null||h.endYear===null)return c.period;
 const start=h.startYear,end=h.endYear;
 if(c.period.includes(String(Math.abs(start)))&&c.period.includes(String(Math.abs(end))))return c.period;
 if(start===end)return start<0?`${Math.abs(start)} BCE`:String(start);
 if(end<0)return`${Math.abs(start)}–${Math.abs(end)} BCE`;
 if(start<0)return`${Math.abs(start)} BCE–${end} CE`;
 return`${start}–${end}`;
}
