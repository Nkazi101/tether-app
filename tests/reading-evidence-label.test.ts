import test from 'node:test';
import assert from 'node:assert/strict';
import {currentAccountEvidenceLabel} from '../src/components/StoryVisual';
import {narrativeContextFixture} from './fixtures/narrative-context';

test('the trust label preserves attributed, unconfirmed and interpretive tiers instead of claiming accuracy',()=>{
 const f=narrativeContextFixture();
 const tiers=['reported','attributed-claim','hearsay','opinion','satire'] as const;
 const current={...f.current,facts:tiers.map((tier,i)=>({...f.current.facts[0],id:`observation-${i}`,tier}))};
 const label=currentAccountEvidenceLabel({...f.base,currentFrame:current});
 assert.equal(label,'5 observations · 1 current source · 1 reported, 1 attributed claim, 1 unconfirmed account, 1 opinion, 1 satirical observation');
 assert.doesNotMatch(label,/verified|confirmed truth|accurate|checked automatically/);
});

test('evidence counts reflect referenced sources rather than unrelated or duplicated packets',()=>{
 const f=narrativeContextFixture();
 const story={...f.base,currentFrame:f.current,sources:[...f.base.sources,...f.base.sources,{...f.currentSource,id:'unused-account'}]};
 assert.match(currentAccountEvidenceLabel(story),/1 current source/);
 assert.equal(currentAccountEvidenceLabel({...f.base,currentFrame:undefined}),'1 current source');
});
