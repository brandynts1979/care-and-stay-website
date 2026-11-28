import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../../academy/industry/index.html',import.meta.url),'utf8');
const parent=readFileSync(new URL('../../academy/index.html',import.meta.url),'utf8');
test('industry inquiry route has five distinct planned offers, accessible navigation and no checkout',()=>{
 assert.match(page,/<html lang="en">/);assert.match(page,/name="robots" content="noindex, nofollow"/);
 assert.match(page,/href="#content"/);assert.match(page,/<main id="content">/);
 assert.match(parent,/href="\/academy\/industry\/"/);
 assert.equal((page.match(/class="academy-card" id="/g)||[]).length,5);
 for(const id of ['senior-care','hospice-palliative-home-health','home-care','dd-services','hospitality'])assert.equal((page.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 assert.equal((page.match(/class="academy-tag">In development<\/p>/g)||[]).length,5);
 assert.match(page,/No paid enrollment, self-registration or purchase/);
 assert.equal((page.match(/href="mailto:hello@mycareandstay\.com\?subject=/g)||[]).length,6);
 assert.doesNotMatch(page,/<form|<script|<iframe|checkout\.stripe|buy\.stripe|\$\d|api[_-]?key/i);
 assert.match(page,/Please do not include patient, resident, guest or employee identifiers/);
});
