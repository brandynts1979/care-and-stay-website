import assert from 'node:assert/strict';
import test from 'node:test';
import { validModuleMediaPath } from '../../academy/edge-functions/academy-manager/media-path.mjs';

test('media signer accepts only canonical module and shared foundation object paths', () => {
  const moduleId = 'd3000000-0000-4000-8000-000000000001';
  const file = 'a'.repeat(64) + '.mp4';
  assert.ok(validModuleMediaPath(moduleId, `${moduleId}/${file}`));
  assert.ok(validModuleMediaPath(moduleId, `shared/foundation-v1-m08/${file}`));
  for (const path of [
    null, `${moduleId}/${file}\n`, `${moduleId.slice(0, -1)}2/${file}`,
    `shared/foundation-v1-m09/${file}`, `shared/foundation-v0-m01/${file}`,
    `shared/foundation-v1-m01/../${file}`, `https://example.invalid/${file}`,
  ]) {
    assert.equal(validModuleMediaPath(moduleId, path), false);
  }
});
