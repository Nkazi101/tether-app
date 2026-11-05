export const omissionMarker='\n[Middle of this source omitted from the bounded excerpt.]\n';
export function boundedSourceText(text:string){return text.length<=12000?text:text.slice(0,5800)+omissionMarker+text.slice(-6000);}
export function sourceExcerptMetadata(text:string){return text.includes(omissionMarker)?{readSegments:text.split(omissionMarker),readingScope:'Bounded excerpt: opening and ending retained; intervening text omitted.'}:{};}
