'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const msg = $('message');
  const authPanel = $('authPanel');
  const memberPanel = $('memberPanel');
  const coursesNode = $('courses');
  const lessonsNode = $('lessons');
  const detail = $('lessonDetail');
  const reviewsNode = $('reviewer');
  const cfg = window.CARE_STAY_ACADEMY_CONFIG || {};
  const hidden = (node, yes) => node.classList.toggle('academy-hide', !!yes);
  const elt = (tag, text, css) => { const n = document.createElement(tag); if(text!==undefined) n.textContent=String(text); if(css)n.className=css;return n; };
  const button = (label, handler, alt=false) => { const n=elt('button',label,'academy-btn'+(alt?' alt':''));n.type='button';n.addEventListener('click',handler);return n; };
  const show = (text, error=false) => {msg.textContent=text;msg.classList.toggle('academy-error',error);};
  let db, user, enrollment, recovering=false;
  const safeError = e => show(e?.message || 'Please retry the action.',true);
  if(!cfg.supabaseUrl || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl)
    || !cfg.publishableKey || /service_role|sb_secret_|^sk_/.test(cfg.publishableKey)) {
    show('The Academy learner portal is not yet configured for enrollment. No registration or charges are available here.');
    return;
  }
  if(!window.supabase?.createClient){show('Unable to load the secure sign-in service. Refresh and try again.',true);return;}
  db = window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const read = async (table, query) => {const {data,error}=await query(db.from(table));if(error)throw error;return data||[];};

  const locationsNode = $('locationsPanel');
  const invitationsNode = $('invitesPanel');
  const managerRequest = async (action,values={}) => {
    const {data,error}=await db.functions.invoke('academy-manager',{body:{action,...values}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    return data;
  };
  const entry = (type,placeholder) => {
    const n=elt('input',undefined,'academy-input');
    n.type=type;n.placeholder=placeholder;n.autocomplete='off';
    if(type==='email')n.setAttribute('aria-label','Manager email address');
    if(type==='text')n.setAttribute('aria-label','Restaurant location name');
    return n;
  };
  async function loadInternalDemo(current){
    const status=await managerRequest('demo_status');
    if(!current()||!status?.eligible)return;
    const holder=elt('div',undefined,'academy-lesson');
    holder.append(elt('h3','Care & Stay internal test access'));
    if(status.active){
      holder.append(elt('p','Your complimentary Academy test access is active through '+new Date(status.expires_at).toLocaleDateString()+'. You will not be charged.'));
    }else{
      holder.append(elt('p','This complimentary test is for your verified Care & Stay owner account. No Stripe charge or subscription is created.'));
      holder.append(button('Activate my Academy test access',async()=>{
        try{
          const result=await managerRequest('activate_demo');
          show('Your Academy test access is active. No payment was collected.');
          await loadLocations();await loadCourses();
        }catch(e){safeError(e);}
      }));
    }
    locationsNode.append(holder);
  }
  async function loadLocations(){
    const current=sessionGuard();
    if(!current())return;
    const {locations}=await managerRequest('list_locations');
    if(!current())return;
    locationsNode.replaceChildren(elt('h2','Organizations and locations'));
    if(!locations?.length){
      locationsNode.append(elt('p','Restaurant owners can create a location. For another industry Academy, request an approved organization and offer from Care & Stay. No charge occurs until you complete Stripe Checkout.'));
    }
    const nameInput=entry('text','Restaurant location name');
    const nameLabel=elt('label','Add a restaurant location');nameLabel.append(nameInput);
    locationsNode.append(nameLabel,button('Create location',async()=>{
      try{
        if(nameInput.value.trim().length<2)return show('Enter a restaurant location name.',true);
        await managerRequest('create_location',{name:nameInput.value.trim()});
        show('Location created. Add a subscription to activate manager invitations.');
        await loadLocations();
      }catch(e){safeError(e);}
    }));
    for(const loc of locations||[]){
      const item=elt('section',undefined,'academy-lesson');
      item.append(elt('h3',loc.name));
      item.append(elt('p','Subscription: '+loc.subscription_status+' · Your role: '+loc.role));
      const offer=loc.industry_offer;
      const canBill=loc.role==='owner'&&loc.billing_owner!==false;
      if(offer){
        item.append(elt('p',offer.course_title));
        if(canBill&&Number.isSafeInteger(offer.unit_amount)&&offer.unit_amount>0&&offer.currency==='usd'){
          const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(offer.unit_amount/100);
          const tax=offer.tax_behavior==='exclusive'?' plus applicable tax':offer.tax_behavior==='inclusive'?' including applicable tax':'';
          item.append(elt('p','Approved offer: '+amount+'/month'+tax+'. Review the terms in Stripe Checkout before paying.'));
        }
      }
      if(canBill){
        if(!['active','trialing'].includes(loc.subscription_status) && (offer?offer.checkout_available===true:cfg.billingEnabled===true)) item.append(button('Review subscription & price',async()=>{
          try{const {checkout_url}=await managerRequest('create_checkout',{location_id:loc.id});
            if(!checkout_url || !/^https:\/\/checkout\.stripe\.com\//.test(checkout_url))throw new Error('Unable to open Stripe Checkout');
            window.location.assign(checkout_url);
          }catch(e){safeError(e);}
        }));
        else if(['active','trialing'].includes(loc.subscription_status)) item.append(button('Manage billing',async()=>{
          try{const {portal_url}=await managerRequest('billing_portal',{location_id:loc.id});
          if(!portal_url || !/^https:\/\/billing\.stripe\.com\//.test(portal_url))throw new Error('Unable to open Stripe billing portal');
          window.location.assign(portal_url);}catch(e){safeError(e);}
        },true));
      }
      if(['owner','gm'].includes(loc.role)&&['active','trialing'].includes(loc.subscription_status)){
        const addr=entry('email','manager@example.com');
        const label=elt('label','Invite a manager or shift leader by email');label.append(addr);item.append(label);
        const role=elt('select',undefined,'academy-input');
        role.setAttribute('aria-label','Invited manager role');
        for(const value of loc.role==='owner'?['gm','manager','shift_leader']:['manager','shift_leader']){
          const opt=elt('option',value.replace('_',' '));opt.value=value;role.append(opt);
        }
        item.append(role,button('Invite manager',async()=>{
          try{const response=await managerRequest('invite',{location_id:loc.id,email:addr.value.trim(),role:role.value});
          show(response.message||'Invitation recorded.');addr.value='';
          const previous=item.querySelector('[data-invite-link]');if(previous)previous.remove();
          if(response.invitation_url){
            const linkBlock=elt('div');linkBlock.dataset.inviteLink='true';
            linkBlock.append(elt('p','Share this link directly with the invited manager if the email was not delivered.'));
            const link=elt('a','Manager invitation link');link.href=response.invitation_url;
            link.rel='noopener noreferrer';linkBlock.append(link);
            linkBlock.append(button('Copy invitation link',async()=>{
              try{await navigator.clipboard.writeText(response.invitation_url);show('Invitation link copied.');}
              catch{show('Use the invitation link above to share it.',true);}
            },true));
            item.append(linkBlock);
          }
          }catch(e){safeError(e);}
        }));
        const viewTeam=async(page=0)=>{
          try{
            if(!current()||!item.isConnected)return;
            const {members,has_more}=await managerRequest('list_members',{location_id:loc.id,page});
            if(!current()||!item.isConnected)return;
            let old=item.querySelector('[data-team]');if(old)old.remove();
            const block=elt('div');block.dataset.team='true';
            block.append(elt('h3','Team learning progress'));
            block.append(elt('p','Page '+String(page+1)+' · '+String(members.length)+' associated team members on this page. Private reflections and scenario responses are not shared.'));
            for(const member of members){
              const card=elt('div',undefined,'academy-lesson');
              card.append(elt('p',member.role.replaceAll('_',' ')+' · '+(member.active?'Active':'Inactive')+' · '+member.user_id.slice(0,8)+'…'));
              if(member.active){
                if(!Array.isArray(member.progress))card.append(elt('p','Team progress is not available on this backend version.'));
                else if(!member.progress.length)card.append(elt('p','No course enrollment recorded.'));
                else for(const course of member.progress){
                  const done=Number(course.lessons_completed),total=Number(course.lessons_total);
                  const summary=course.course_title+' · '+course.status+' · '+done+' of '+total+' published lessons completed';
                  card.append(elt('p',summary));
                  if(total>0&&Number.isFinite(done)&&Number.isFinite(total)){
                    const track=elt('div',undefined,'academy-track');
                    track.setAttribute('role','progressbar');track.setAttribute('aria-label',course.course_title+' lesson progress');
                    track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(total));track.setAttribute('aria-valuenow',String(Math.max(0,Math.min(total,done))));
                    const fill=elt('div',undefined,'academy-track-fill');
                    fill.style.width=Math.max(0,Math.min(100,done/total*100))+'%';
                    track.append(fill);card.append(track);
                  }
                }
                const canRemove=loc.role==='owner'?['gm','manager','shift_leader'].includes(member.role):
                  loc.role==='gm'&&['manager','shift_leader'].includes(member.role);
                if(canRemove)card.append(button('Remove access',async()=>{
                  try{await managerRequest('deactivate_member',{location_id:loc.id,user_id:member.user_id});
                    show('Manager access removed from this location.');await loadLocations();}catch(e){safeError(e);}
                },true));
              }
              block.append(card);
            }
            const controls=elt('div',undefined,'academy-actions');
            if(page>0)controls.append(button('Previous team page',()=>viewTeam(page-1),true));
            if(has_more)controls.append(button('Next team page',()=>viewTeam(page+1),true));
            block.append(controls);item.append(block);
          }catch(e){safeError(e);}
        };
        item.append(button('View team',()=>viewTeam(),true));
      }
      locationsNode.append(item);
    }
    await loadInternalDemo(current);
  }
  async function loadInvitations(){
    const current=sessionGuard();
    if(!current())return;
    const {invitations}=await managerRequest('pending_invites');
    if(!current())return;
    hidden(invitationsNode,!invitations?.length);
    invitationsNode.replaceChildren(elt('h2','Invitations for you'));
    for(const invite of invitations||[]){
      const item=elt('div',undefined,'academy-lesson');
      item.append(elt('p',invite.location_name+' — '+invite.intended_role.replace('_',' ')));
      item.append(button('Join this location',async()=>{
        try{await managerRequest('accept_invite',{invitation_id:invite.id});
        show('Invitation accepted. Your Academy access is being prepared.');
        await loadInvitations();await loadLocations();await loadCourses();}catch(e){safeError(e);}
      }));
      invitationsNode.append(item);
    }
  }

  const signin = async () => {
    const email=$('email').value.trim(), password=$('password').value;
    if(!email||!password) return show('Please enter your email and password.',true);
    const {error}=await db.auth.signInWithPassword({email,password});
    if(error) return safeError(error);
    $('password').value='';await refresh();
  };
  $('authForm').addEventListener('submit',e=>{e.preventDefault();signin().catch(safeError);});
  $('register').addEventListener('click',async()=>{
    try{
      const email=$('email').value.trim(),password=$('password').value;
      if(!email||password.length<8) return show('Enter your email and a password with at least 8 characters.',true);
      const {error}=await db.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/academy/learn/'}});
      if(error)throw error;
      $('password').value='';
      show('Check your email to confirm your account. Course access requires a separately verified enrollment.');
    }catch(e){safeError(e);}
  });
  $('reset').addEventListener('click',async()=>{
    try{
      if(!$('email').value.trim())return show('Enter your email first.',true);
      const {error}=await db.auth.resetPasswordForEmail($('email').value.trim(),{redirectTo:location.origin+'/academy/learn/'});
      if(error)throw error;
      show('If the address has an account, password recovery instructions have been sent.');
    }catch(e){safeError(e);}
  });
  $('signout').addEventListener('click',async()=>{try{await db.auth.signOut();await refresh();}catch(e){safeError(e);}});
  $('recoveryForm').addEventListener('submit',async e=>{
    e.preventDefault();try{
      const password=$('newPassword').value;
      if(password.length<8)return show('Use a password with at least 8 characters.',true);
      const {error}=await db.auth.updateUser({password});
      if(error)throw error;
      $('newPassword').value='';recovering=false;
      show('Password updated. Your session is secured.');await refresh();
    }catch(err){safeError(err);}
  });
  // No vendor or permanent file URLs in the public JavaScript. A short-lived
  // playback URL is requested on a deliberate learner action, not during listing.
  let mediaEpoch=0,authEpoch=0,lessonEpoch=0;
  function sessionGuard(){
    const epoch=authEpoch;
    return ()=>epoch===authEpoch&&!!user&&!recovering;
  }
  function clearModulePlayers(){
    mediaEpoch++;lessonEpoch++;
    for(const video of lessonsNode.querySelectorAll('video')){
      video.pause();video.removeAttribute('src');video.load();
    }
    for(const node of lessonsNode.querySelectorAll('.academy-media-player'))node.replaceChildren();
  }
  function invalidateLearningSession(){
    authEpoch++;clearModulePlayers();enrollment=null;user=null;
    hidden(detail,true);hidden(lessonsNode,true);
    detail.replaceChildren();lessonsNode.replaceChildren();coursesNode.replaceChildren();reviewsNode.replaceChildren();
    locationsNode.replaceChildren();invitationsNode.replaceChildren();
  }
  function moduleVideoCard(m,e,metadata,epoch){
    const section=elt('section',undefined,'academy-module-video');
    const title=String(metadata.title||'Module introduction');
    const seconds=Number(metadata.duration_seconds);
    const time=Number.isInteger(seconds)&&seconds>0?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):'';
    section.append(elt('p','MODULE VIDEO','academy-overline'),elt('h4',title),
      elt('p',[time,'English captions','Optional introduction'].filter(Boolean).join(' · '),'academy-media-meta'));
    const holder=elt('div',undefined,'academy-media-player');
    const status=elt('p','','academy-media-meta');status.setAttribute('role','status');
    const play=button('Watch module video',async()=>{
      if(epoch!==mediaEpoch||enrollment?.id!==e.id||!user||recovering)return;
      play.disabled=true;status.textContent='Preparing secure playback…';
      try{
        const data=await managerRequest('play_module_media',{enrollment_id:e.id,module_id:m.id});
        if(epoch!==mediaEpoch||enrollment?.id!==e.id||!user||recovering||!section.isConnected)return;
        const url=new URL(data?.url);
        if(url.protocol!=='https:'||url.origin!==new URL(cfg.supabaseUrl).origin||
          !url.pathname.startsWith('/storage/v1/object/sign/academy-module-media/')||!url.searchParams.get('token'))throw Error('Unexpected playback URL');
        for(const old of holder.querySelectorAll('video')){old.pause();old.removeAttribute('src');old.load();}
        const video=elt('video');video.controls=true;video.playsInline=true;video.preload='metadata';
        video.setAttribute('aria-label',title+' — captioned instructional video');
        video.addEventListener('error',()=>{status.textContent='Playback unavailable or the access link expired. Select Watch module video to retry.';play.disabled=false;});
        video.src=url.href;holder.replaceChildren(video);
        status.textContent='Video ready. Press play to begin. Captions are included in the video.';
      }catch{
        if(epoch===mediaEpoch&&section.isConnected)status.textContent='Video unavailable. Your reading and exercises remain available; retry playback later.';
      }finally{play.disabled=false;}
    },true);
    section.append(play,holder,status);
    return section;
  }
  async function refresh(){
    invalidateLearningSession();const authRequest=authEpoch;
    hidden(memberPanel,true);
    const {data:{user:next},error}=await db.auth.getUser();
    if(authRequest!==authEpoch)return;
    if(error && error.name!=='AuthSessionMissingError')throw error;
    user=next||null;
    hidden(authPanel,!!user || recovering);hidden(memberPanel,!user || recovering);hidden($('recoveryPanel'),!recovering);
    if(recovering)return;
    if(!user){show('Sign in to access an active Academy enrollment.');return;}
    $('userLabel').textContent=user.email||'Signed in';
    show('Signed in securely. Loading your enrollment…');
    await loadLocations();if(authRequest!==authEpoch)return;
    await loadInvitations();if(authRequest!==authEpoch)return;
    await loadCourses();if(authRequest!==authEpoch)return;
    await loadReviews();
  }
  async function loadCourses(){
    const current=sessionGuard();
    if(!current())return;
    const {data,error}=await db.rpc('academy_learner_available_enrollments');
    if(!current())return;
    if(error)throw error;
    coursesNode.replaceChildren(elt('h2','My courses'));
    const eligible=data||[];
    if(!eligible.length){coursesNode.append(elt('p','No active course access is associated with this account. Enrollment and payment activation are managed separately.'));show('Signed in. No active enrollment.');return;}
    const courses=await read('academy_courses',q=>q.select('id,slug,title,published').in('id',eligible.map(x=>x.course_id)));
    if(!current())return;
    for(const e of eligible){
      const course=courses.find(c=>c.id===e.course_id && c.published);
      if(!course)continue;
      const item=elt('div',undefined,'academy-lesson');item.append(elt('strong',course.title+' · '+e.location_name+' · '+e.status));
      item.append(button('Open course',()=>loadLessons(e,course).catch(safeError),true));coursesNode.append(item);
    }
    show('Your Academy courses are ready.');
  }
  const moduleGuides=[["Discover strengths","Recognize the conditions that make this team effective.","Identify specific successes and design an appreciative improvement experiment."],["Lead authentically","Make values, service and healthy boundaries visible in daily work.","Practice credible, fair decisions that combine care and accountability."],["Build belonging","Create trust, psychological safety and reasons employees choose to stay.","Listen to employees and turn insight into meaningful action."],["Coach for growth","Use curiosity, feedback and delegation to develop people.","Guide development conversations and create visible growth opportunities."],["Transform conflict","Respond to tension with courage, empathy and accountability.","Navigate a difficult conversation and develop a constructive agreement."],["Sustain the culture","Build practical leadership routines and evidence of improvement.","Create a 30/60/90-day leadership plan that can be measured and sustained."]];
  async function downloadCertificate(enrollmentId, current) {
    if (!current()) return;
    const {data, error} = await db.rpc('academy_my_completion_certificate', {p_enrollment: enrollmentId});
    if (!current()) return;
    if (error) throw error;
    const certificate = data?.[0];
    if (!certificate) {
      show('An approved completion certificate is unavailable for this enrollment.');
      return;
    }

    const page = document.implementation.createHTMLDocument('Academy certificate of completion');
    page.documentElement.lang = 'en';
    const style = page.createElement('style');
    style.textContent = 'body{font:18px Georgia,serif;color:#16342d;line-height:1.5;margin:10vh auto;text-align:center;max-width:650px;padding:2rem}h1{margin-top:2rem}strong{font-size:1.4rem}@media print{body{margin:2rem auto}}';
    page.head.append(style);
    page.body.append(
      elt('p', 'Care & Stay Academy'),
      elt('h1', 'Certificate of completion'),
      elt('p', 'Awarded to'),
      elt('strong', user.email || user.id),
      elt('p', 'For completing ' + certificate.course_title),
      elt('p', 'Awarded ' + new Intl.DateTimeFormat(undefined, {dateStyle: 'long', timeZone: 'UTC'})
        .format(new Date(certificate.awarded_at))),
    );
    const url = URL.createObjectURL(new Blob(['<!doctype html>', page.documentElement.outerHTML], {type: 'text/html'}));
    const link = elt('a');
    link.href = url;
    link.download = 'academy-certificate-of-completion.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    show('Certificate downloaded. Open the file to print or save it as a PDF.');
  }
  const careSettingCourses = new Set([
    'stay-culture-leadership-academy-senior-care-v2',
    'stay-culture-leadership-academy-hospice-v2',
    'stay-culture-appreciative-business-development-v1',
  ]);
  const applicationLabels = {
    case_study: 'Case study', scenario: 'Scenario', simulation: 'Simulation',
    exercise: 'Exercise', reflection: 'Reflection question', fieldwork: 'Fieldwork',
    recommendation: 'Developmental recommendation',
  };
  async function loadCareSettings(course, enrollmentId, intro, current) {
    if (!careSettingCourses.has(course.slug)) return null;
    try {
      const {data, error} = await db.rpc('academy_my_care_settings', {p_enrollment: enrollmentId});
      if (!current() || error || !data?.length) return null;
      const label = elt('label', 'Care setting for the next lesson you open');
      const select = elt('select', undefined, 'academy-input');
      const foundation = elt('option', 'Shared foundation');
      foundation.value = '';
      select.append(foundation);
      for (const setting of data) {
        const option = elt('option', setting.label);
        option.value = setting.setting_key;
        select.append(option);
      }
      label.append(select);
      intro.append(label);
      return select;
    } catch {
      return null;
    }
  }
  async function showLessonApplications(lessonId, enrollmentId, setting, current) {
    if (!setting) return;
    try {
      const {data, error} = await db.rpc('academy_my_lesson_applications', {
        p_enrollment: enrollmentId, p_lesson: lessonId, p_setting: setting.key,
      });
      if (!current() || error || !data?.length) return;
      const section = elt('section', undefined, 'academy-question');
      section.append(elt('h3', 'Practice for ' + setting.label));
      for (const application of data) {
        const label = applicationLabels[application.kind];
        if (!label) continue;
        section.append(elt('h4', label));
        for (const paragraph of application.body.split(/\n\n+/)) section.append(elt('p', paragraph));
      }
      detail.append(section);
    } catch {
      // Shared lesson content remains available if the optional application request fails.
    }
  }
  function renderLearningGoals(course, lessonActions, current) {
    const map = window.ACADEMY_GOAL_MAPS?.[course.id];
    if (map?.slug !== course.slug) return null;
    const goals = map.goals.map(goal => ({
      label: goal.label,
      lessons: goal.lessons.map(id => lessonActions.get(id)).filter(Boolean),
    })).filter(goal => goal.lessons.length);
    if (!goals.length) return null;

    const panel = elt('section', undefined, 'academy-question');
    panel.append(elt('h3', 'Practice a learning goal'));
    panel.append(elt('p', 'Choose a goal to find relevant lessons. Your selection stays in this course view.'));
    const label = elt('label', 'Learning goal');
    const select = elt('select', undefined, 'academy-input');
    const placeholder = elt('option', 'Choose a goal');
    placeholder.value = '';
    select.append(placeholder);
    goals.forEach((goal, index) => {
      const option = elt('option', goal.label);
      option.value = String(index);
      select.append(option);
    });
    label.append(select);
    const suggestions = elt('ul');
    suggestions.setAttribute('aria-live', 'polite');
    select.addEventListener('change', () => {
      if (!current()) return;
      suggestions.replaceChildren();
      if (select.value === '') return;
      const goal = goals[Number(select.value)];
      for (const lesson of goal?.lessons || []) {
        const item = elt('li');
        item.append(button(lesson.title, () => {
          if (!current()) return;
          lesson.card.open = true;
          lesson.action.click();
        }, true));
        suggestions.append(item);
      }
    });
    panel.append(label, suggestions);
    return panel;
  }
  async function loadLessons(e,course){
    if(!user||recovering)return;
    clearModulePlayers();const epoch=mediaEpoch;
    enrollment=e; hidden(lessonsNode,false);hidden(detail,true);
    lessonsNode.replaceChildren();
    const intro=elt('div',undefined,'academy-course-heading');
    intro.append(elt('p','YOUR LEARNING PATH','academy-overline'),elt('h2',course.title),
      elt('p','Loading your course…','academy-intro'));
    lessonsNode.append(intro);
    const modules=await read('academy_modules',q=>q.select('id,title,position,overview').eq('course_id',course.id).order('position'));
    const progress=await read('academy_lesson_progress',q=>q.select('lesson_id').eq('enrollment_id',e.id));
    const done=new Set(progress.map(p=>p.lesson_id));
    let moduleMedia=new Map();
    try{
      const response=await managerRequest('list_module_media',{enrollment_id:e.id});
      moduleMedia=new Map((response?.modules||[]).filter(m=>m.captioned===true).map(m=>[m.module_id,m]));
    }catch{/* Optional video service must not prevent access to the lessons. */}
    if(epoch!==mediaEpoch||enrollment?.id!==e.id||!user||recovering)return;

    const lessons=modules.length?await read('academy_lessons',q=>q.select('id,module_id,title,body,position').in('module_id',modules.map(m=>m.id)).eq('published',true).order('position')):[];
    if(epoch!==mediaEpoch||enrollment?.id!==e.id||!user||recovering)return;
    intro.querySelector('.academy-intro').textContent=modules.length+' '+(modules.length===1?'module':'modules')+' · '+lessons.length+' '+(lessons.length===1?'lesson':'lessons')+' · Learn, reflect, and apply at your own pace.';
    if(!lessons.length){lessonsNode.append(elt('p','No published lessons are currently available for this course. Contact your Academy administrator if you expect access.'));return;}
    const currentCourse = () => epoch === mediaEpoch && enrollment?.id === e.id && !!user && !recovering;
    const settings = careSettingCourses.has(course.slug) ? await loadCareSettings(course, e.id, intro, currentCourse) : null;
    if (!currentCourse()) return;
    const finished=lessons.filter(l=>done.has(l.id)).length;
    const summary=elt('div',undefined,'academy-progress-summary');
    const head=elt('div',undefined,'academy-progress-top');
    head.append(elt('strong','Course progress'),elt('span',finished+' of '+lessons.length+' lessons completed'));
    const track=elt('div',undefined,'academy-track');
    track.setAttribute('role','progressbar');track.setAttribute('aria-valuemin','0');
    track.setAttribute('aria-valuemax',String(lessons.length));track.setAttribute('aria-valuenow',String(finished));track.setAttribute('aria-label','Course progress');
    const fill=elt('div',undefined,'academy-track-fill');fill.style.width=(lessons.length?100*finished/lessons.length:0)+'%';
    track.append(fill);summary.append(head,track);lessonsNode.append(summary);
    if (e.status === 'completed') {
      const current = () => epoch === mediaEpoch && enrollment?.id === e.id && !!user && !recovering;
      summary.append(button('Download completion certificate', async () => {
        try { await downloadCertificate(e.id, current); }
        catch { if (current()) show('Could not retrieve your certificate. Please retry.', true); }
      }, true));
    }
    const cards=elt('div',undefined,'academy-modules');
    const lessonActions = new Map();
    for(const m of modules){
      const items=lessons.filter(l=>l.module_id===m.id);
      const completed=items.filter(l=>done.has(l.id)).length;
      const guide=(course.slug==='stay-culture-leadership-academy'?moduleGuides[m.position-1]:null)||['Leadership practice','Explore '+m.title.toLowerCase()+'.','Practice the learning objectives in the module introduction.'];
      const card=elt('details',undefined,'academy-module-card');
      if(completed>0&&completed<items.length||m.position===1&&finished===0)card.open=true;
      const header=elt('summary',undefined,'academy-module-header');
      const num=elt('span',String(m.position).padStart(2,'0'),'academy-module-number');
      const title=elt('div',undefined,'academy-module-heading');
      title.append(elt('span','MODULE '+m.position+' · '+guide[0].toUpperCase(),'academy-overline'),
        elt('h3',m.title),elt('p',guide[1]));
      header.append(num,title,elt('span',completed+' / '+items.length+' complete','academy-count'));card.append(header);
      const content=elt('div',undefined,'academy-module-content');
      content.append(elt('p','Learning outcome: '+guide[2],'academy-outcome'));
      if(moduleMedia.has(m.id))content.append(moduleVideoCard(m,e,moduleMedia.get(m.id),epoch));
      if(m.overview){
        const intro=elt('details',undefined,'academy-module-guide');
        const trigger=elt('summary','Read the module introduction and guiding questions');
        intro.append(trigger);
        const reading=elt('div',undefined,'academy-reading');
        for(const block of m.overview.split(/\n\n/)){
          const match=block.match(/^([A-Z][A-Z &–—-]{4,})\n([\s\S]*)$/);
          if(!match){reading.append(elt('p',block));continue;}
          const section=elt('section',undefined,'academy-reading-section');
          section.append(elt('h4',match[1].toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase())));
          section.append(elt('p',match[2]));
          reading.append(section);
        }
        intro.append(reading);content.append(intro);
      }
      const list=elt('ol',undefined,'academy-lesson-list');
      for(const lesson of items){
        const row=elt('li',undefined,'academy-lesson-row');
        const label=elt('div',undefined,'academy-lesson-label');
        label.append(elt('span',done.has(lesson.id)?'✓':'',done.has(lesson.id)?'academy-lesson-status complete':'academy-lesson-status'));
        const copy=elt('div');copy.append(elt('strong',lesson.title),elt('small','Lesson '+lesson.position+' · Learn · Reflect · Apply'));
        label.append(copy);
        const action = button(done.has(lesson.id)?'Review lesson':'Study lesson',async()=>{
          if(epoch!==mediaEpoch||enrollment?.id!==e.id||!user||recovering)return;
          const request=++lessonEpoch;
          try{await openLesson(lesson,done.has(lesson.id),row,e.id,request,course.slug,
            settings?.value ? {key: settings.value, label: settings.selectedOptions[0].textContent} : null);}
          catch(err){if(request===lessonEpoch&&enrollment?.id===e.id&&user&&!recovering){safeError(err);detail.append(elt('p','Unable to load this lesson. '+(err?.message||'Please retry.'),'academy-error'));}}
        },true);
        lessonActions.set(lesson.id, {title: lesson.title, card, action});
        row.append(label,action);
        list.append(row);
      }
      content.append(list);card.append(content);cards.append(card);
    }
    const goals = renderLearningGoals(course, lessonActions, currentCourse);
    if (goals) lessonsNode.append(goals);
    lessonsNode.append(cards);
  }
  async function loadWorksheets(lessonId, enrollmentId, current) {
    const templates = await read('academy_worksheet_templates', q =>
      q.select('id,title,prompts,version').eq('lesson_id', lessonId).order('title'));
    if (!current() || !templates.length) return;
    const responses = await read('academy_worksheet_responses', q =>
      q.select('template_id,answers').eq('enrollment_id', enrollmentId).in('template_id', templates.map(t => t.id)));
    if (!current()) return;
    for (const template of templates) {
      const saved = responses.find(response => response.template_id === template.id)?.answers || {};
      const section = elt('section', undefined, 'academy-question');
      section.append(elt('h3', template.title));
      section.append(elt('p', 'Your answers are private. Use fictional or de-identified examples.'));
      const status = elt('p', '', 'academy-save-status');
      status.setAttribute('role', 'status');
      const inputs = template.prompts.map((prompt, index) => {
        const label = elt('label', prompt);
        const input = elt('textarea', undefined, 'academy-input');
        input.maxLength = 2000;
        input.rows = 3;
        input.value = saved[String(index + 1)] || '';
        label.append(input);
        section.append(label);
        return input;
      });
      const save = button('Save private worksheet', async () => {
        if (!current()) return;
        save.disabled = true;
        inputs.forEach(input => { input.disabled = true; });
        status.textContent = 'Saving…';
        try {
          const answers = Object.fromEntries(inputs.map((input, index) => [String(index + 1), input.value]));
          const {error} = await db.rpc('academy_save_worksheet', {
            p_enrollment: enrollmentId, p_template: template.id, p_answers: answers,
          });
          if (error) throw error;
          if (current()) status.textContent = 'Private worksheet saved.';
        } catch {
          if (current()) status.textContent = 'Could not save your worksheet. Please retry.';
        } finally {
          save.disabled = false;
          inputs.forEach(input => { input.disabled = false; });
        }
      });
      section.append(save, status);
      detail.append(section);
    }
  }
  async function openLesson(l,completed,clickedRow,enrollmentId,request,courseSlug,setting){
    const current=()=>request===lessonEpoch&&enrollment?.id===enrollmentId&&!!user&&!recovering&&clickedRow.isConnected;
    if(!current())return;
    // Keep the lesson directly next to the Study lesson button rather than after all 24 lessons.
    // The previous placement looked like a nonresponsive button, especially on mobile.
    clickedRow.append(detail);
    hidden(detail,false);
    detail.replaceChildren(elt('h2',l.title),elt('p','Loading lesson activities…'));
    detail.scrollIntoView({behavior:'smooth',block:'start'});
    const header=elt('div',undefined,'academy-study-header');
    header.append(elt('p','LEARN · REFLECT · APPLY','academy-overline'),elt('h2',l.title));
    const reading=elt('div',undefined,'academy-reading');
    for(const part of l.body.split(/\n\n(?=[A-Z][A-Z &–—-]{4,}\n)/)){
      const match=part.match(/^([A-Z][A-Z &–—-]{4,})\n([\s\S]*)$/);
      if(!match){reading.append(elt('p',part));continue;}
      const section=elt('section',undefined,'academy-reading-section');
      section.append(elt('h3',match[1].toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase())));
      for(const paragraph of match[2].split(/\n\n/))if(paragraph.trim())section.append(elt('p',paragraph.trim()));
      reading.append(section);
    }
    detail.replaceChildren(header,reading);
    if (setting) await showLessonApplications(l.id, enrollmentId, setting, current);
    if (!current()) return;
    const scenarios=await read('academy_scenarios',q=>q.select('id,prompt,position').eq('lesson_id',l.id).order('position'));
    if(!current())return;
    for(const scenario of scenarios){
      const box=elt('section',undefined,'academy-question');
      box.append(elt('strong',scenario.prompt));
      const choices=await read('academy_choices',q=>q.select('id,choice_text,feedback,position').eq('scenario_id',scenario.id).order('position'));
    if(!current())return;
      const feedback=elt('p');feedback.setAttribute('aria-live','polite');
      choices.forEach(ch=>{
        const b=button(ch.choice_text,()=>{feedback.textContent=ch.feedback;},true);
        b.style.display='block';b.style.margin='10px 0';box.append(b);
      });
      box.append(feedback);detail.append(box);
    }
    const notes=await read('academy_private_reflections',q=>q.select('body').eq('enrollment_id',enrollmentId).eq('lesson_id',l.id));
    if(!current())return;
    const reflectionSection=elt('section',undefined,'academy-question');
    reflectionSection.append(elt('h3','Private reflection — just for you'));
    reflectionSection.append(elt('p','Use this space for your own thoughts, questions, and learning. It is not shared with a GM, manager, or reviewer.'));
    const reflectionLabel=elt('label','My private reflection');
    const input=elt('textarea',undefined,'academy-input');
    input.rows=5;input.value=notes[0]?.body||'';
    reflectionLabel.append(input);reflectionSection.append(reflectionLabel);
    const reflectionStatus=elt('p','', 'academy-save-status');
    reflectionStatus.setAttribute('role','status');reflectionStatus.setAttribute('aria-live','polite');
    input.addEventListener('input',()=>{reflectionStatus.textContent='Unsaved changes';reflectionStatus.classList.remove('academy-error');});
    const reflectionSave=button('Save private reflection',async()=>{
      if(!current())return;
      reflectionSave.disabled=true;reflectionStatus.textContent='Saving…';reflectionStatus.classList.remove('academy-error');
      try{
        const {error}=await db.from('academy_private_reflections').upsert({enrollment_id:enrollmentId,lesson_id:l.id,body:input.value,modified_at:new Date().toISOString()},{onConflict:'enrollment_id,lesson_id'});
        if(!current())return;
        if(error)throw error;
        reflectionStatus.textContent='✓ Private reflection saved successfully.';
        show('Private reflection saved.');
      }catch(e){if(!current())return;reflectionStatus.textContent='Could not save reflection: '+(e?.message||'Please retry.');reflectionStatus.classList.add('academy-error');safeError(e);}
      finally{reflectionSave.disabled=false;}
    });
    reflectionSection.append(reflectionSave,reflectionStatus);
    detail.append(reflectionSection);

    const existing=await read('academy_submissions',q=>q.select('body').eq('enrollment_id',enrollmentId).eq('lesson_id',l.id));
    if(!current())return;
    const practiceSection=elt('section',undefined,'academy-question');
    practiceSection.append(elt('h3','Put it into practice — evidence for feedback'));
    practiceSection.append(elt('p','This is different from your private reflection. Try the activity at work, then describe what you did, what happened, and what you learned. Your submission can be reviewed by someone specifically assigned to support your development.'));
    const practiceMatch=l.body.match(/PRACTICE EVIDENCE FOR REVIEW\n([^\n]+)/);
    if(practiceMatch)practiceSection.append(elt('p','For this lesson: '+practiceMatch[1]));
    practiceSection.append(elt('p','You can return and submit after trying the activity. You do not have to copy your private reflection here.'));
    const submitLabel=elt('label','My real-world practice and what I learned');
    const submission=elt('textarea',undefined,'academy-input');submission.rows=4;submission.value=existing[0]?.body||'';
    submission.placeholder='What did you try? How did others respond? What will you do next?';
    submitLabel.append(submission);practiceSection.append(submitLabel);
    const practiceStatus=elt('p','', 'academy-save-status');
    practiceStatus.setAttribute('role','status');practiceStatus.setAttribute('aria-live','polite');
    submission.addEventListener('input',()=>{practiceStatus.textContent=existing.length?'Edited, not yet shared':'Not yet shared';practiceStatus.classList.remove('academy-error');});
    const practiceSave=button(existing.length?'Update shared practice submission':'Share practice for review',async()=>{
      if(!current())return;
      if(!submission.value.trim()){practiceStatus.textContent='Please describe an action you tried before sharing.';practiceStatus.classList.add('academy-error');return;}
      practiceSave.disabled=true;practiceStatus.textContent='Sharing…';practiceStatus.classList.remove('academy-error');
      try{
        const {error}=await db.from('academy_submissions').upsert({enrollment_id:enrollmentId,lesson_id:l.id,body:submission.value},{onConflict:'enrollment_id,lesson_id'});
        if(!current())return;
        if(error)throw error;
        practiceStatus.textContent='✓ Practice submission saved and available to your assigned reviewer.';
        practiceSave.textContent='Update shared practice submission';
        show('Practice submission saved.');
      }catch(e){if(!current())return;practiceStatus.textContent='Could not share practice: '+(e?.message||'Please retry.');practiceStatus.classList.add('academy-error');safeError(e);}
      finally{practiceSave.disabled=false;}
    });
    practiceSection.append(practiceSave,practiceStatus);
    detail.append(practiceSection);
    if (courseSlug !== 'stay-culture-leadership-academy') {
      try {
        await loadWorksheets(l.id, enrollmentId, current);
      } catch {
        if (current()) detail.append(elt('p', 'Private worksheets are temporarily unavailable.'));
      }
      if (!current()) return;
    }
    detail.append(button(completed?'Completed ✓':'Mark lesson complete',async()=>{
      if(!current())return;
      try{
        const {error}=await db.from('academy_lesson_progress').upsert({enrollment_id:enrollmentId,lesson_id:l.id},{onConflict:'enrollment_id,lesson_id'});
        if(!current())return;
        if(error)throw error;show('Lesson progress saved.');
      }catch(e){if(current())safeError(e);}
    },true));
  }
  async function loadReviews(){
    const current=sessionGuard();
    if(!current())return;
    const reviewerId=user.id;
    const assignments=await read('academy_reviewer_assignments',q=>q.select('enrollment_id').eq('reviewer_user_id',reviewerId));
    if(!current())return;
    if(!assignments.length){hidden(reviewsNode,true);return;}
    hidden(reviewsNode,false);reviewsNode.replaceChildren(elt('h2','Assigned practice reviews'));
    const submissions=await read('academy_submissions',q=>q.select('id,enrollment_id,body,submitted_at').in('enrollment_id',assignments.map(a=>a.enrollment_id)));
    if(!current())return;
    if(!submissions.length){reviewsNode.append(elt('p','No submissions yet.'));return;}
    const awardControls = new Set();
    for(const s of submissions){
      const item=elt('div',undefined,'academy-lesson');item.append(elt('p',s.body));
      const comment=elt('textarea',undefined,'academy-input');comment.placeholder='Write constructive reviewer feedback';comment.rows=3;item.append(comment);
      for(const decision of ['approved','changes_requested'])item.append(button(decision==='approved'?'Approve':'Request changes',async()=>{
        if(!current()||!item.isConnected)return;
        try{
          const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.body));
          const submissionHash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
          if(!current()||!item.isConnected)return;
          const {error}=await db.from('academy_reviews').upsert({
            submission_id:s.id,reviewer_user_id:reviewerId,decision,feedback:comment.value,
            submission_sha256:submissionHash,
          },{onConflict:'submission_id'});
          if(!current())return;
          if(error)throw error;show('Your review was saved.');
        }catch(e){if(current())safeError(e);}
      },decision!=='approved'));
      if (!awardControls.has(s.enrollment_id)) {
        awardControls.add(s.enrollment_id);
        const award = button('Award certificate for this enrollment', async () => {
          if (!current() || !item.isConnected) return;
          award.disabled = true;
          try {
            await managerRequest('award_certificate', {enrollment_id: s.enrollment_id});
            if (current()) show('Completion certificate awarded.');
          } catch (error) {
            if (current()) safeError(error);
          } finally {
            award.disabled = false;
          }
        }, true);
        item.append(award);
      }
      reviewsNode.append(item);
    }
  }
  db.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY'){
      invalidateLearningSession();recovering=true;hidden(authPanel,true);hidden(memberPanel,true);hidden($('recoveryPanel'),false);
      show('Enter a new password to finish account recovery.');
    }
    if(event==='SIGNED_OUT'){
      invalidateLearningSession();recovering=false;hidden(memberPanel,true);hidden(authPanel,false);hidden($('recoveryPanel'),true);
      show('Sign in to access an active Academy enrollment.');
    }
  });
  refresh().catch(safeError);
})();
