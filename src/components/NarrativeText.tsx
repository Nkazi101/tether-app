import React from 'react';
import {narrativeSegments} from '../lib/narrative-terms';
import {ModelTerm} from './ModelTerm';
/** Definitions appear beside a term in the reading, on hover, focus or tap. */
export function NarrativeText({text}:{text:string}){
 return <>{narrativeSegments(text).map((part,i)=>part.term?<ModelTerm key={i} term={part.term}>{part.text}</ModelTerm>:part.text)}</>;
}
