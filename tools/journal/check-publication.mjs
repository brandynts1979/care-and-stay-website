// Non-deployment publication gate for the Stay Culture Journal.
// Usage: node tools/journal/check-publication.mjs <slug>
// This validates a proposed release. It never changes the site or sends messages.
import {readFileSync} from "node:fs";
const slug=process.argv[2];
if(!slug){console.error("Usage: node tools/journal/check-publication.mjs <slug>");process.exit(2);}
const {entries}=JSON.parse(readFileSync(new URL("../../editorial/approval-register.json",import.meta.url),"utf8"));
const entry=entries.find(e=>e.slug===slug);
if(!entry){console.error("REJECTED: Article not registered.");process.exit(1);}
if(entry.status!=="approved"||entry.ownerApproved!==true||!entry.approvalDate||!entry.approvedBy){
 console.error("BLOCKED: Editorial approval is missing for "+slug+".");
 process.exit(1);
}
console.log("Editorial approval present for "+slug+". Additional production QA and explicit deployment authorization are still required.");
