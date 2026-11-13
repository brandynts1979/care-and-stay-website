// Static DD app smoke checks, no credentials or external services required.
// Run: node dd-caregiver-dev/tests/check-app.mjs
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
const page=readFileSync(new URL('../index.html', import.meta.url),'utf8');
const scriptTag=page.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptTag,'DD app must contain its JavaScript');
new Script(scriptTag[1],{filename:'dd-caregiver-dev/index.html'});
for(const id of ['signin','signup','signout','dashboard','strengthsModule','teamModule','tasksModule','documentsModule','docFile','docPerson','uploadDocument','taskList','sendTeamInvite']){
 assert.ok(page.includes('id="'+id+'"'), 'Missing UI element: '+id);
}
for(const f of ['loadPeople','loadTeam','loadTasks','loadDocuments','uploadDocument','docStorage','createTask']){
 assert.ok(scriptTag[1].includes('function '+f+'('),'Missing implementation: '+f);
}
assert.ok(page.includes('Fictional/test documents only'),'Development notice must be present');
assert.ok(page.includes("const DOC_BUCKET='dd-private-documents'"),'Must use private documents bucket');
assert.ok(!page.includes('service_role'),'Service role credentials must not be present');
assert.ok(!page.includes('sb_secret_'),'Secret API credentials must not be present');
console.log('PASS: DD app JavaScript parses; core modules present; development warnings and public key hygiene checked');
