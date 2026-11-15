import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const root = 'http://127.0.0.1:8765';
const pages = ['/community/','/community/members/','/community/guidelines/','/community/terms/','/community/privacy/','/community/family-caregivers/','/community/dd-families/'];
const widths = [320,390,768,1280];
const browser=await chromium.launch({headless:true});
let failures=0;
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:820},deviceScaleFactor:1});
  for(const path of pages){
   const page=await context.newPage();
   try{
    const response=await page.goto(root+path,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200,path+' returns 200');
    if(path==='/community/members/'){
      await page.evaluate(()=>{document.querySelector('#auth').hidden=false});
    }
    const metrics=await page.evaluate(()=>({
      viewport:window.innerWidth,
      body:document.body.scrollWidth,
      doc:document.documentElement.scrollWidth,
      text:document.querySelector('h1')?.textContent || '',
      links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))
    }));
    assert.ok(metrics.doc<=metrics.viewport+1 && metrics.body<=metrics.viewport+1,
      path+' overflows width '+width+': '+JSON.stringify(metrics));
    if(['/community/','/community/guidelines/','/community/members/'].includes(path)){
      assert.ok(metrics.links.includes('/community/privacy/'),path+' missing privacy link');
      assert.ok(metrics.links.includes('/community/terms/'),path+' missing terms link');
    }
    if(path==='/community/members/'){
      const state=await page.evaluate(()=>({signup:document.getElementById('signup-button')?.hidden,terms:document.querySelector('a[href="/community/terms/"]')!==null}));
      assert.ok(state.signup,'Signups must stay closed in release candidate');
    }
    console.log('PASS '+width+'px '+path);
   }catch(e){failures++;console.error('FAIL '+width+'px '+path+': '+e.message);await page.screenshot({path:'/tmp/community-fail-'+width+'-'+path.replaceAll('/','_')+'.png'}).catch(()=>{});}
   finally{await page.close()}
  }
  await context.close()
 }
}finally{await browser.close()}
if(failures)process.exitCode=1;
