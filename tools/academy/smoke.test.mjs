import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const page = readFileSync(resolve(root, 'academy/index.html'), 'utf8');
const launch = readFileSync(resolve(root, 'academy/LAUNCH_SPEC.md'), 'utf8');
const main = readFileSync(resolve(root, 'index.html'), 'utf8');
const portal = readFileSync(resolve(root, 'client-portal/index.html'), 'utf8');

test('Academy landing route exists and uses HTML5', () => {
  assert.match(page, /^<!doctype html>/i);
  assert.match(page, /<html lang="en">/i);
  assert.match(page, /<meta name="viewport"/i);
});
test('Academy is explicitly described as not yet enrolling', () => {
  assert.match(page, /Enrollment is not yet open\./i);
  assert.match(page, /No charge or account creation takes place on this page/i);
});
test('Academy landing page does not launch payment or account creation', () => {
  assert.doesNotMatch(page, /<form\b/i);
  assert.doesNotMatch(page, /checkout\.stripe\.com|buy\.stripe\.com|\/api\/(?:checkout|signup)/i);
  assert.doesNotMatch(page, /stripe\.redirectToCheckout/i);
});
test('Academy does not expose any embedded credential', () => {
  assert.doesNotMatch(page, /sk_(?:live|test)_|whsec_|service_role|sb_secret_/i);
});
test('Academy page does not include unsanitized external scripts', () => {
  assert.doesNotMatch(page, /<script\b/i);
});
test('All in-page links are safe, local, or HTTPS', () => {
  const urls = [...page.matchAll(/\bhref="([^"]+)"/g)].map(x => x[1]);
  assert.ok(urls.length >= 2);
  for (const u of urls) assert.match(u, /^(?:\/(?!\/)|#|https:\/\/)/i, `Unexpected link: ${u}`);
});
test('No videos are required for curriculum completion', () => {
  assert.match(page, /Videos are optional additions/i);
  assert.match(launch, /no videos required/i);
  assert.doesNotMatch(page, /<video\b|<iframe\b/i);
});
test('Accessible page outline exists', () => {
  assert.match(page, /<main>/i);
  assert.equal((page.match(/<h1[\s>]/gi) || []).length, 1);
  assert.match(page, /aria-label="Academy navigation"/i);
  assert.match(page, /:focus-visible/);
});
test('Responsive layout and graceful course card layout', () => {
  assert.match(page, /grid-template-columns:repeat\(auto-fit/);
  assert.match(page, /clamp\(/);
});
test('Required private notes and reviewer separation specified', () => {
  assert.match(launch, /academy_private_reflections/);
  assert.match(launch, /academy_reviewer_assignments/);
  assert.match(launch, /RLS or equivalent/i);
});
test('Payment provisioning must be verified before enabling checkout', () => {
  assert.match(launch, /checkout \*\*disabled\*\*/i);
  assert.match(launch, /Stripe webhook/i);
});
test('Do not misrepresent information page as launched LMS', () => {
  assert.match(launch, /not an LMS/i);
  assert.match(page, /learner portal and payment system are being validated/i);
});
test('Live home and client portal have no Academy checkout links', () => {
  assert.doesNotMatch(main + portal, /buy\.stripe\.com\/.*academy/i);
});
test('No accidental completed-graduation claims', () => {
  assert.doesNotMatch(page, /certif(?:ied|ication) now|graduates? today/i);
});
test('Release gate does not claim ready without full end-to-end tests', () => {
  assert.match(launch, /Release-blocking tests/i);
  assert.match(launch, /purchase-to-entitlement/i);
});
console.log('Academy public-page smoke checks passed. This is NOT LMS or Stripe E2E certification.');
