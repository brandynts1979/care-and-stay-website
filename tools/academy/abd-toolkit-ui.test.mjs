import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,tools} from '../../academy/learn/abd-toolkit-ui.mjs';
test('seven browser calculators enforce valid inputs and missing values',()=>{
 assert.equal(Object.keys(tools).length,7);
 assert.match(calculate('pipeline-planner',['2000,0.4\n3000,0.2']),/1,400/);
 assert.match(calculate('territory-plan',['120','30,60,40']),/Overallocated/);
 assert.equal(calculate('growth-scorecard',['0','0']),'Rate: Unavailable');
 assert.match(calculate('growth-scorecard',['8','40']),/20.00%/);
 assert.match(calculate('experiment-journal',['4','40','8','40']),/10.00 percentage points/);
 for(const v of [['','40'],['9','8'],['-1','4'],['1.5','5']])assert.throws(()=>calculate('growth-scorecard',v));
 assert.throws(()=>calculate('pipeline-planner',['10,2']));
 assert.throws(()=>calculate('territory-plan',['100','10,20']));
});
test('ethical gates and unverified evidence do not imply approval',()=>{
 assert.match(calculate('organizational-niche',['claim','same\nSAME','owner','boundary']),/More/);
 assert.match(calculate('organizational-niche',['claim','first\nsecond','owner','boundary']),/not approved/);
 assert.equal(calculate('micro-niche',['yes','yes','unknown','yes']),'investigate');
 assert.equal(calculate('micro-niche',['yes','yes','no','yes']),'revise');
 assert.equal(calculate('ideal-partnership',['yes','no','yes','yes','2','2','2','2']),'stop');
 assert.equal(calculate('ideal-partnership',['yes','unknown','yes','yes','2','2','2','2']),'unverified');
 assert.match(calculate('ideal-partnership',['yes','yes','yes','yes','2','1','2','1']),/6\/8/);
});
