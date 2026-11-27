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

import { QSR_ORIGINAL_MEDIA } from '../../academy/edge-functions/academy-manager/qsr-original-media.mjs';
import { readFileSync } from 'node:fs';
test('eight original QSR files are accepted only for their exact module identities',()=>{
  assert.equal(QSR_ORIGINAL_MEDIA.length,8);
  assert.equal(new Set(QSR_ORIGINAL_MEDIA.map(x=>x.module_id)).size,8);
  assert.equal(new Set(QSR_ORIGINAL_MEDIA.map(x=>x.object_path)).size,8);
  const migration=readFileSync('academy/database/staged_qsr_original_media.sql','utf8');
  for(const row of QSR_ORIGINAL_MEDIA){
    assert.ok(validModuleMediaPath(row.module_id,row.object_path));
    for(const other of QSR_ORIGINAL_MEDIA.filter(x=>x!==row)){
      assert.equal(validModuleMediaPath(other.module_id,row.object_path),false);
    }
    for(const path of [row.object_path+' ', 'folder/'+row.object_path, encodeURIComponent(row.object_path), 'https://example.invalid/'+row.object_path]){
      assert.equal(validModuleMediaPath(row.module_id,path),false);
    }
    assert.ok(migration.includes("'"+row.module_id+"'::uuid,"+row.position+",'"+row.title+"','"+row.object_path+"',"+row.expected_bytes+","+row.duration_seconds));
  }
});
