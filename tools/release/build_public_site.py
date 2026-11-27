#!/usr/bin/env python3
"""Build only explicitly reviewed tracked browser assets; never publish repository root."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

PUBLIC = tuple('''academy/index.html
academy/learn/app.js
academy/learn/config.js
academy/learn/index.html
agency-partnerships/index.html
agency-partnerships/portal/app.js
agency-partnerships/portal/index.html
beta-admin/index.html
client-portal/index.html
community/community.css
community/dd-families/index.html
community/family-caregivers/index.html
community/guidelines/index.html
community/index.html
community/members/app.js
community/members/config.json
community/members/index.html
community/members/members.css
community/members/registration.js
community/privacy/index.html
community/terms/index.html
dd-caregiver-dev/index.html
dd-family-care/app/index.html
dd-family-care/index.html
dd-partnerships/index.html
employer-login/index.html
family-login/index.html
index.html
individual-leadership-360/index.html
individual-leadership-360/individual-pricing.css
individual-login/index.html
individual-site-nav.css
journal/index.html
legal/dd-family-privacy/index.html
legal/dd-family-subscription-terms/index.html
legal/family-privacy/index.html
legal/family-subscription-terms/index.html
site-navigation.js
stay-culture-360-beta/index.html
stay-culture-360/assets/care-and-stay-logo.png
stay-culture-360/index.html
stay-culture-360/organizations/index.html
stay-culture-360/qsr/index.html
stay-culture-journal/privacy/index.html
stay-culture-snapshot/index.html
styles.css'''.splitlines())
PRIVATE = {'.github', 'internal', 'tests', 'tools', 'supabase', 'edge-functions', 'database', 'migrations', 'test', 'docs', 'qa'}
BROWSER = {'.html', '.css', '.js', '.mjs', '.json', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.mp4', '.webm', '.pdf'}

def tracked(root):
    raw = subprocess.check_output(['git', '-C', str(root), 'ls-files', '-z'])
    return set(raw.decode('utf-8').split('\0')) - {''}

def plan(root, target):
    known = tracked(root)
    missing = set(PUBLIC) - known
    unexpected = {p for p in known-set(PUBLIC) if Path(p).suffix.lower() in BROWSER and not set(Path(p).parts) & PRIVATE}
    if missing or unexpected:
        raise ValueError('Manifest review required: ' + json.dumps({'missing':sorted(missing),'unreviewed_browser_assets':sorted(unexpected)}))
    paths = PUBLIC if target == 'site' else ('dd-caregiver-dev/index.html',)
    result = []
    for rel in paths:
        src = root / rel
        if any((root.joinpath(*Path(rel).parts[:i])).is_symlink() for i in range(1, len(Path(rel).parts)+1)) or not src.is_file():
            raise ValueError('Non-regular or symlinked source: ' + rel)
        dest = rel if target == 'site' else 'index.html'
        result.append((src, dest))
    return result

def build(root, target):
    root = root.resolve()
    output = root / ('.site-public' if target == 'site' else '.dd-public')
    if output.exists() or output.is_symlink():
        raise ValueError('Output already exists; use a clean checkout')
    entries = plan(root, target)
    with tempfile.TemporaryDirectory(prefix='.public-build-', dir=root) as temp:
        stage = Path(temp)/'package'
        stage.mkdir()
        hashes = {}
        for src, rel in entries:
            dest = stage/rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dest)
            hashes[rel] = hashlib.sha256(dest.read_bytes()).hexdigest()
        stage.rename(output)
    return {'target':target, 'files':len(hashes), 'sha256':hashes}

def self_test():
    def check(cond):
        if not cond: raise AssertionError('package test failed')
    def rejects(fn):
        try: fn()
        except ValueError: return
        raise AssertionError('unsafe package was accepted')
    with tempfile.TemporaryDirectory() as d:
        root=Path(d)
        subprocess.run(['git','init','-q',str(root)],check=True)
        for p in PUBLIC+('internal/qa.md','dd-caregiver-dev/migrations/private.sql','academy/edge-functions/private.ts','tests/test.mjs'):
            f=root/p; f.parent.mkdir(parents=True,exist_ok=True); f.write_text(p,encoding='utf-8')
        subprocess.run(['git','-C',str(root),'add','.'],check=True)
        a=build(root,'site'); check(a['files']==len(PUBLIC)); check(not (root/'.site-public/internal').exists()); check(not (root/'.site-public/dd-caregiver-dev/migrations').exists()); check((root/'.site-public/index.html').read_text()=='index.html')
        b=build(root,'dd'); check(b['files']==1 and (root/'.dd-public/index.html').read_text()=='dd-caregiver-dev/index.html')
        rejects(lambda:build(root,'site'))
        (root/'new-public.js').write_text('unreviewed'); subprocess.run(['git','-C',str(root),'add','new-public.js'],check=True)
        rejects(lambda:plan(root,'site'))
        subprocess.run(['git','-C',str(root),'rm','--cached','-f','new-public.js'],check=True,stdout=subprocess.DEVNULL)
        (root/'styles.css').unlink(); (root/'styles.css').symlink_to('internal/qa.md'); rejects(lambda:plan(root,'site'))
        (root/'styles.css').unlink(); rejects(lambda:plan(root,'site'))
    print('PASS 6 package cases: public allowlist, DD-only package, existing output refusal, unknown assets refusal, symlink refusal, missing file refusal')

if __name__ == '__main__':
    p=argparse.ArgumentParser(); p.add_argument('--target',choices=['site','dd'],default='site'); p.add_argument('--root',type=Path,default=Path.cwd()); p.add_argument('--self-test',action='store_true'); a=p.parse_args()
    if a.self_test: self_test()
    else: print(json.dumps(build(a.root,a.target),sort_keys=True))
