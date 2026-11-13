import {createClient} from '@supabase/supabase-js';
const $=id=>document.getElementById(id);
const names={'family-caregivers':'Family Caregivers','dd-families':'DD Parents & Families'};
let client, user, memberships=[], terms, current='family-caregivers', generation=0, recovering=false;
const status=(message,error=false)=>{ $('status').textContent=message; $('status').classList.toggle('error',error); };
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn,secondary=true){const b=el('button',text,secondary?'button secondary':'button');b.type='button';b.addEventListener('click',()=>run(fn,b));return b;}
async function run(fn,b){if(b)b.disabled=true;try{await fn();}catch(e){status(e.message||'Something went wrong. Please try again.',true);}finally{if(b)b.disabled=false;}}
function clearPrivate(){generation++;memberships=[];$('content').replaceChildren();$('membership').replaceChildren();$('workspace').hidden=true;$('account').hidden=true;document.querySelectorAll('dialog').forEach(d=>d.remove());}
async function api(action,payload={}){const {data,error}=await client.rpc('cs_forum_request',{action,payload:{community:current,...payload}});if(error){if(error.code==='42501'){$('content').replaceChildren();}throw error;}return data;}
function field(form,label,name,kind='text',max=8000){const id=`field-${name}-${crypto.randomUUID()}`;const l=el('label',label);l.htmlFor=id;form.append(l);const n=el(kind==='textarea'?'textarea':'input');n.id=id;n.name=name;if(kind!=='textarea')n.type=kind;n.maxLength=max;n.required=true;form.append(n);return n;}
function pager(box,offset,more,fn){const nav=el('div',undefined,'pager');if(offset>0)nav.append(button('Previous',()=>fn(Math.max(0,offset-20))));if(more)nav.append(button('Next',()=>fn(offset+20)));box.append(nav);}
function when(v){return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}
function moderator(){return memberships.find(m=>m.community===current)?.role==='moderator';}
async function refreshAccount(){
 const ticket=++generation;
 const {data,error}=await client.auth.getUser();if(error)throw error;
 if(ticket!==generation)return;
 user=data.user;
 if(!user){clearPrivate();$('auth').hidden=false;return;}
 const me=await api('me');if(ticket!==generation)return;
 memberships=me.memberships;terms=me.terms_version;
 $('auth').hidden=true;$('account').hidden=false;$('identity').textContent=`Signed in as ${user.email}`;
 await showCommunity();
}
async function showCommunity(){
 generation++;$('content').replaceChildren();$('workspace').hidden=true;const area=$('membership');area.replaceChildren();
 const m=memberships.find(m=>m.community===current);
 if(m?.status==='suspended'){area.append(el('p','Your access to this community is paused. Contact Care & Stay for help.','community-note'));return;}
 if(m?.status!=='active'){
  const form=el('form',undefined,'editor');form.append(el('h2',`Join ${names[current]}`),el('p','Choose a display name. Only people who join this community can read and contribute.'));
  const name=field(form,'Display name','display_name','text',50);name.minLength=2;if(m)name.value=m.display_name;
  const label=el('label');const check=el('input');check.type='checkbox';check.required=true;
  label.append(check,document.createTextNode('I am 18 or older and agree to the community guidelines.'));
  const link=el('a','Read the guidelines');link.href='/community/guidelines/';link.target='_blank';link.rel='noopener';form.append(label,link);
  const submit=el('button','Join this community','button');submit.type='submit';form.append(el('p'),submit);
  form.addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('join',{display_name:name.value,adult:check.checked,terms_version:terms});await refreshAccount();status('You have joined the community.');},submit);});area.append(form);return;
 }
 const summary=el('p',`Posting as ${m.display_name}`);
 area.append(summary,button('Change display name',async()=>{const name=await ask('Change display name','Display name',m.display_name,2,50);if(name!==null){await api('profile',{display_name:name});await refreshAccount();}}),button('Leave community',async()=>{if(await confirmAction('Leave this community?','You will lose access to discussions. Existing posts remain unless you remove them first.')){await api('leave');await refreshAccount();}}));
 $('workspace').hidden=false;$('community-title').textContent=names[current];$('queue').hidden=!moderator();await list();
}
async function list(offset=0){
 const ticket=++generation;const rows=await api('list',{offset});if(ticket!==generation)return;
 const box=$('content');box.replaceChildren(el('h3','Recent discussions'));
 if(!rows.length)box.append(el('p','No discussions yet. You can start the first one.'));
 rows.slice(0,20).forEach(row=>{const card=el('article',undefined,'discussion');const h=el('h3');const b=button(row.title,()=>thread(row.id));b.className='discussion-title';h.append(b);card.append(h,el('p',`${row.author} · ${when(row.created_at)}`,'meta'));box.append(card);});
 pager(box,offset,rows.length>20,list);status('Discussions are up to date.');
}
async function ask(title,label,value='',min=5,max=1000){
 return new Promise(resolve=>{const d=el('dialog',undefined,'dialog');const f=el('form');f.append(el('h2',title));const input=field(f,label,'value','textarea',max);input.minLength=min;input.value=value;const actions=el('div',undefined,'actions');const ok=el('button','Continue','button');ok.type='submit';actions.append(ok,button('Cancel',()=>d.close()));f.append(actions);d.append(f);document.body.append(d);let result=null;f.addEventListener('submit',e=>{e.preventDefault();result=input.value.trim();if(result.length<min){input.setCustomValidity(`Enter at least ${min} characters.`);input.reportValidity();return;}d.close();});input.addEventListener('input',()=>input.setCustomValidity(''));d.addEventListener('close',()=>{d.remove();resolve(result);},{once:true});d.showModal();input.focus();});
}
async function confirmAction(title,message){
 return new Promise(resolve=>{const d=el('dialog',undefined,'dialog');d.append(el('h2',title),el('p',message));let yes=false;const a=el('div',undefined,'actions');a.append(button('Confirm',()=>{yes=true;d.close();},false),button('Cancel',()=>d.close()));d.append(a);document.body.append(d);d.addEventListener('close',()=>{d.remove();resolve(yes);},{once:true});d.showModal();});
}
function message(row,refresh){
 const card=el('article',undefined,'message');card.append(el('p',`${row.author} · ${when(row.created_at)}`,'meta'),el('p',row.body,'message-body'));
 const actions=el('div',undefined,'message-actions');
 const act=(text,fn)=>{const b=button(text,fn);b.className='text-button';actions.append(b);};
 act('Report',async()=>{const reason=await ask('Report a concern','What should the moderator review?');if(reason!==null){await api('report',{id:row.id,reason});status('Your report was submitted for moderator review. This is not an emergency response service.');}});
 if(row.mine)act('Remove my message',async()=>{if(await confirmAction('Remove this message?','Its text will be removed. Removing a discussion also hides its replies.')){await api('delete_own',{id:row.id});await list();}});
 if(moderator()){
  act('Hide message',async()=>{const reason=await ask('Hide this message','Reason for the moderation record');if(reason!==null){await api('hide',{id:row.id,reason});await list();}});
  if(row.author_id&&row.author_id!==user.id)act('Pause member',async()=>{const reason=await ask('Pause this member’s access','Reason for the moderation record');if(reason!==null){await api('suspend',{user_id:row.author_id,reason});status('Member access paused in this community.');}});
 }
 card.append(actions);return card;
}
async function thread(id,offset=0){
 const ticket=++generation;const data=await api('thread',{id,offset});if(ticket!==generation)return;
 const box=$('content');box.replaceChildren(button('← All discussions',()=>list()),el('h2',data.title),message(data,()=>thread(id,offset)),el('h3','Replies'));
 if(!data.replies.length)box.append(el('p','No replies on this page.'));
 data.replies.slice(0,20).forEach(r=>box.append(message(r,()=>thread(id,offset))));pager(box,offset,data.replies.length>20,n=>thread(id,n));
 const f=el('form',undefined,'editor');const body=field(f,'Your reply','body','textarea');const submit=el('button','Post reply','button');submit.type='submit';f.append(el('p','Please share your own experience and avoid identifying details.','fine'),submit);
 f.addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('reply',{id,body:body.value});await thread(id,offset);status('Reply posted.');},submit);});box.append(f);status('Discussion loaded.');
}
function compose(){
 generation++;const box=$('content');box.replaceChildren();const f=el('form',undefined,'editor');f.append(el('h2','Start a discussion'));const title=field(f,'Title','title','text',160);title.minLength=3;
 const label=el('label','Discussion space');label.htmlFor='post-topic';const topic=el('select');topic.id='post-topic';[['everyday','Introductions & everyday support'],['resources',current==='dd-families'?'Services, school & adulthood':'Navigating care & resources'],['family','You & your family']].forEach(([v,t])=>{const o=el('option',t);o.value=v;topic.append(o);});f.append(label,topic);
 const body=field(f,'Your message','body','textarea');const submit=el('button','Post discussion','button');submit.type='submit';const actions=el('div',undefined,'actions');actions.append(submit,button('Cancel',()=>list()));f.append(actions);box.append(f);title.focus();
 f.addEventListener('submit',e=>{e.preventDefault();run(async()=>{const data=await api('create',{title:title.value,body:body.value,topic:topic.value});await thread(data.id);status('Discussion posted.');},submit);});
}
async function queue(offset=0){
 const ticket=++generation;const rows=await api('moderation',{offset});if(ticket!==generation)return;const box=$('content');box.replaceChildren(el('h2','Reported concerns'));
 if(!rows.length)box.append(el('p','No open reports.'));
 rows.slice(0,20).forEach(r=>{const card=el('article',undefined,'report');card.append(el('h3',r.title||'Reported reply'),el('p',`${r.author} · ${r.hidden?'Hidden':'Visible'}`,'meta'),el('p',r.body,'message-body'),el('h3','Reported concern'),el('p',r.reason,'message-body'));const actions=el('div',undefined,'actions');
  for(const [a,t] of [[r.hidden?'restore':'hide',r.hidden?'Restore message':'Hide message'],['resolve','Resolve report']]) actions.append(button(t,async()=>{const reason=await ask(t,'Reason for the moderation record');if(reason!==null){await api(a,{id:r.message_id,reason});await queue(offset);}}));
  if(r.author_id&&r.author_id!==user.id)for(const [a,t] of [['suspend','Pause member'],['reinstate','Reinstate member']])actions.append(button(t,async()=>{const reason=await ask(t,'Reason for the moderation record');if(reason!==null){await api(a,{user_id:r.author_id,reason});status('Membership updated.');}}));card.append(actions);box.append(card);
 });pager(box,offset,rows.length>20,queue);status('Moderator queue loaded.');
}
async function init(){
 const response=await fetch('/community/members/config.json',{cache:'no-store'});if(!response.ok)throw new Error('Community configuration is unavailable. Please try later.');const config=await response.json();
 if(!config.enabled){status(config.notice||'Community discussions are not open yet.');return;}
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl)||!config.publishableKey.startsWith('sb_publishable_'))throw new Error('Community configuration is incomplete. Please contact Care & Stay.');
 client=createClient(config.supabaseUrl,config.publishableKey,{auth:{storageKey:'care-stay-community-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){recovering=true;clearPrivate();$('auth').hidden=true;$('recovery').hidden=false;status('Choose a new password.');}
  else if(event==='SIGNED_IN' && user && session?.user.id!==user.id){clearPrivate();setTimeout(()=>run(refreshAccount),0);}
  else if(event==='SIGNED_OUT'){user=null;recovering=false;clearPrivate();$('recovery').hidden=true;$('auth').hidden=false;$('password').value='';status('You are signed out.');}
 });
 $('auth-form').addEventListener('submit',e=>{e.preventDefault();const action=e.submitter?.value||'signin';run(async()=>{const email=$('email').value.trim(),password=$('password').value;const res=action==='signup'?await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/community/members/'}}):await client.auth.signInWithPassword({email,password});if(res.error)throw res.error;$('password').value='';if(action==='signup'&&!res.data.session)status('Check your email to verify your account. If you already have an account, sign in or reset your password.');else await refreshAccount();},e.submitter);});
 const authEmail=()=>{const e=$('email');if(!e.value||!e.checkValidity()){e.reportValidity();throw new Error('Enter a valid email address first.');}return e.value.trim();};
 $('reset').addEventListener('click',()=>run(async()=>{const {error}=await client.auth.resetPasswordForEmail(authEmail(),{redirectTo:location.origin+'/community/members/'});if(error)throw error;status('If this email has an account, a reset link will arrive shortly.');},$('reset')));
 $('resend').addEventListener('click',()=>run(async()=>{const {error}=await client.auth.resend({type:'signup',email:authEmail(),options:{emailRedirectTo:location.origin+'/community/members/'}});if(error)throw error;status('If verification is needed, a new email will arrive shortly.');},$('resend')));
 $('recovery-form').addEventListener('submit',e=>{e.preventDefault();run(async()=>{const {error}=await client.auth.updateUser({password:$('new-password').value});if(error)throw error;$('new-password').value='';$('recovery').hidden=true;recovering=false;await refreshAccount();status('Password updated.');},e.submitter);});
 $('signout').addEventListener('click',()=>run(async()=>{clearPrivate();const {error}=await client.auth.signOut();if(error){$('account').hidden=false;throw error;}},$('signout')));
 $('community').addEventListener('change',()=>run(async()=>{current=$('community').value;await showCommunity();}));
 $('refresh').addEventListener('click',()=>run(()=>refreshAccount(),$('refresh')));$('compose').addEventListener('click',()=>compose());$('queue').addEventListener('click',()=>run(()=>queue(),$('queue')));
 const {data,error}=await client.auth.getSession();if(error)throw error;if(recovering)return;
 if(data.session)await refreshAccount();else{$('auth').hidden=false;status('Sign in to join a community.');}
}
run(init);
