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
  async function loadInternalDemo(){
    const status=await managerRequest('demo_status');
    if(!status?.eligible)return;
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
    const {locations}=await managerRequest('list_locations');
    locationsNode.replaceChildren(elt('h2','Restaurant locations'));
    if(!locations?.length){
      locationsNode.append(elt('p','Create a restaurant location to set up an owner subscription. No charge occurs until you complete Stripe Checkout.'));
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
      if(loc.role==='owner'){
        if(!['active','trialing'].includes(loc.subscription_status) && cfg.billingEnabled===true) item.append(button('Subscribe — $199/month',async()=>{
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
        item.append(button('View team',async()=>{
          try{const {members}=await managerRequest('list_members',{location_id:loc.id});
          let old=item.querySelector('[data-team]');if(old)old.remove();
          const block=elt('div');block.dataset.team='true';
          block.append(elt('p',String(members.length)+' associated team members'));
          for(const member of members){
            const line=elt('p',member.role+' · '+(member.active?'Active':'Inactive')+' · '+member.user_id.slice(0,8)+'…');
            if(member.active && member.role!=='owner')line.append(button('Remove access',async()=>{
              try{await managerRequest('deactivate_member',{location_id:loc.id,user_id:member.user_id});
              show('Manager access removed from this location.');await loadLocations();}catch(e){safeError(e);}
            },true));
            block.append(line);
          }
          item.append(block);
          }catch(e){safeError(e);}
        },true));
      }
      locationsNode.append(item);
    }
    await loadInternalDemo();
  }
  async function loadInvitations(){
    const {invitations}=await managerRequest('pending_invites');
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
  async function refresh(){
    const {data:{user:next},error}=await db.auth.getUser();
    if(error && error.name!=='AuthSessionMissingError')throw error;
    user=next||null;
    hidden(authPanel,!!user || recovering);hidden(memberPanel,!user || recovering);hidden($('recoveryPanel'),!recovering);
    hidden(detail,true);hidden(lessonsNode,true);
    if(!user){show('Sign in to access an active Academy enrollment.');return;}
    $('userLabel').textContent=user.email||'Signed in';
    show('Signed in securely. Loading your enrollment…');
    await loadLocations();await loadInvitations();await loadCourses();await loadReviews();
  }
  async function loadCourses(){
    const data=await read('academy_enrollments',q=>q.select('id,course_id,status,expires_at').order('created_at',{ascending:false}));
    coursesNode.replaceChildren(elt('h2','My courses'));
    const now=Date.now();
    const eligible=data.filter(e=>['active','completed'].includes(e.status)&&(!e.expires_at||Date.parse(e.expires_at)>now));
    if(!eligible.length){coursesNode.append(elt('p','No active course access is associated with this account. Enrollment and payment activation are managed separately.'));show('Signed in. No active enrollment.');return;}
    const courses=await read('academy_courses',q=>q.select('id,title,published').in('id',eligible.map(x=>x.course_id)));
    for(const e of eligible){
      const course=courses.find(c=>c.id===e.course_id && c.published);
      if(!course)continue;
      const item=elt('div',undefined,'academy-lesson');item.append(elt('strong',course.title+' · '+e.status));
      item.append(button('Open course',()=>loadLessons(e,course).catch(safeError),true));coursesNode.append(item);
    }
    show('Your Academy courses are ready.');
  }
  const moduleGuides=[["Discover strengths","Recognize the conditions that make this team effective.","Identify specific successes and design an appreciative improvement experiment."],["Lead authentically","Make values, service and healthy boundaries visible in daily work.","Practice credible, fair decisions that combine care and accountability."],["Build belonging","Create trust, psychological safety and reasons employees choose to stay.","Listen to employees and turn insight into meaningful action."],["Coach for growth","Use curiosity, feedback and delegation to develop people.","Guide development conversations and create visible growth opportunities."],["Transform conflict","Respond to tension with courage, empathy and accountability.","Navigate a difficult conversation and develop a constructive agreement."],["Sustain the culture","Build practical leadership routines and evidence of improvement.","Create a 30/60/90-day leadership plan that can be measured and sustained."]];
  async function loadLessons(e,course){
    enrollment=e; hidden(lessonsNode,false);hidden(detail,true);
    lessonsNode.replaceChildren();
    const intro=elt('div',undefined,'academy-course-heading');
    intro.append(elt('p','YOUR LEARNING PATH','academy-overline'),elt('h2',course.title),
      elt('p','Six modules · 24 lessons · Learn, reflect, and apply at your own pace.','academy-intro'));
    lessonsNode.append(intro);
    const modules=await read('academy_modules',q=>q.select('id,title,position,overview').eq('course_id',course.id).order('position'));
    const progress=await read('academy_lesson_progress',q=>q.select('lesson_id').eq('enrollment_id',e.id));
    const done=new Set(progress.map(p=>p.lesson_id));
    const lessons=await read('academy_lessons',q=>q.select('id,module_id,title,body,position').in('module_id',modules.map(m=>m.id)).eq('published',true).order('position'));
    const finished=lessons.filter(l=>done.has(l.id)).length;
    const summary=elt('div',undefined,'academy-progress-summary');
    const head=elt('div',undefined,'academy-progress-top');
    head.append(elt('strong','Course progress'),elt('span',finished+' of '+lessons.length+' lessons completed'));
    const track=elt('div',undefined,'academy-track');
    track.setAttribute('role','progressbar');track.setAttribute('aria-valuemin','0');
    track.setAttribute('aria-valuemax',String(lessons.length));track.setAttribute('aria-valuenow',String(finished));track.setAttribute('aria-label','Course progress');
    const fill=elt('div',undefined,'academy-track-fill');fill.style.width=(lessons.length?100*finished/lessons.length:0)+'%';
    track.append(fill);summary.append(head,track);lessonsNode.append(summary);
    const cards=elt('div',undefined,'academy-modules');
    for(const m of modules){
      const items=lessons.filter(l=>l.module_id===m.id);
      const completed=items.filter(l=>done.has(l.id)).length;
      const guide=moduleGuides[m.position-1]||['Leadership practice','Explore these lessons.','Apply the learning to your team.'];
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
        row.append(label,button(done.has(lesson.id)?'Review lesson':'Study lesson',async()=>{
          try{await openLesson(lesson,done.has(lesson.id),row);}
          catch(err){safeError(err);detail.append(elt('p','Unable to load this lesson. '+(err?.message||'Please retry.'),'academy-error'));}
        },true));
        list.append(row);
      }
      content.append(list);card.append(content);cards.append(card);
    }
    lessonsNode.append(cards);
  }
  async function openLesson(l,completed,clickedRow){
    // Keep the lesson directly next to the Study lesson button rather than after all 24 lessons.
    // The previous placement looked like a nonresponsive button, especially on mobile.
    clickedRow.after(detail);
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
    const scenarios=await read('academy_scenarios',q=>q.select('id,prompt,position').eq('lesson_id',l.id).order('position'));
    for(const scenario of scenarios){
      const box=elt('section',undefined,'academy-question');
      box.append(elt('strong',scenario.prompt));
      const choices=await read('academy_choices',q=>q.select('id,choice_text,feedback,position').eq('scenario_id',scenario.id).order('position'));
      const feedback=elt('p');feedback.setAttribute('aria-live','polite');
      choices.forEach(ch=>{
        const b=button(ch.choice_text,()=>{feedback.textContent=ch.feedback;},true);
        b.style.display='block';b.style.margin='10px 0';box.append(b);
      });
      box.append(feedback);detail.append(box);
    }
    const notes=await read('academy_private_reflections',q=>q.select('body').eq('enrollment_id',enrollment.id).eq('lesson_id',l.id));
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
      reflectionSave.disabled=true;reflectionStatus.textContent='Saving…';reflectionStatus.classList.remove('academy-error');
      try{
        const {error}=await db.from('academy_private_reflections').upsert({enrollment_id:enrollment.id,lesson_id:l.id,body:input.value,modified_at:new Date().toISOString()},{onConflict:'enrollment_id,lesson_id'});
        if(error)throw error;
        reflectionStatus.textContent='✓ Private reflection saved successfully.';
        show('Private reflection saved.');
      }catch(e){reflectionStatus.textContent='Could not save reflection: '+(e?.message||'Please retry.');reflectionStatus.classList.add('academy-error');safeError(e);}
      finally{reflectionSave.disabled=false;}
    });
    reflectionSection.append(reflectionSave,reflectionStatus);
    detail.append(reflectionSection);

    const existing=await read('academy_submissions',q=>q.select('body').eq('enrollment_id',enrollment.id).eq('lesson_id',l.id));
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
      if(!submission.value.trim()){practiceStatus.textContent='Please describe an action you tried before sharing.';practiceStatus.classList.add('academy-error');return;}
      practiceSave.disabled=true;practiceStatus.textContent='Sharing…';practiceStatus.classList.remove('academy-error');
      try{
        const {error}=await db.from('academy_submissions').upsert({enrollment_id:enrollment.id,lesson_id:l.id,body:submission.value},{onConflict:'enrollment_id,lesson_id'});
        if(error)throw error;
        practiceStatus.textContent='✓ Practice submission saved and available to your assigned reviewer.';
        practiceSave.textContent='Update shared practice submission';
        show('Practice submission saved.');
      }catch(e){practiceStatus.textContent='Could not share practice: '+(e?.message||'Please retry.');practiceStatus.classList.add('academy-error');safeError(e);}
      finally{practiceSave.disabled=false;}
    });
    practiceSection.append(practiceSave,practiceStatus);
    detail.append(practiceSection);
    detail.append(button(completed?'Completed ✓':'Mark lesson complete',async()=>{
      try{
        const {error}=await db.from('academy_lesson_progress').upsert({enrollment_id:enrollment.id,lesson_id:l.id},{onConflict:'enrollment_id,lesson_id'});
        if(error)throw error;show('Lesson progress saved.');
      }catch(e){safeError(e);}
    },true));
  }
  async function loadReviews(){
    const assignments=await read('academy_reviewer_assignments',q=>q.select('enrollment_id').eq('reviewer_user_id',user.id));
    if(!assignments.length){hidden(reviewsNode,true);return;}
    hidden(reviewsNode,false);reviewsNode.replaceChildren(elt('h2','Assigned practice reviews'));
    const submissions=await read('academy_submissions',q=>q.select('id,enrollment_id,body,submitted_at').in('enrollment_id',assignments.map(a=>a.enrollment_id)));
    if(!submissions.length){reviewsNode.append(elt('p','No submissions yet.'));return;}
    for(const s of submissions){
      const item=elt('div',undefined,'academy-lesson');item.append(elt('p',s.body));
      const comment=elt('textarea',undefined,'academy-input');comment.placeholder='Write constructive reviewer feedback';comment.rows=3;item.append(comment);
      for(const decision of ['approved','changes_requested'])item.append(button(decision==='approved'?'Approve':'Request changes',async()=>{
        try{
          const {error}=await db.from('academy_reviews').upsert({submission_id:s.id,reviewer_user_id:user.id,decision,feedback:comment.value},{onConflict:'submission_id'});
          if(error)throw error;show('Your review was saved.');
        }catch(e){safeError(e);}
      },decision!=='approved'));
      reviewsNode.append(item);
    }
  }
  db.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){recovering=true;hidden(authPanel,true);hidden(memberPanel,true);hidden($('recoveryPanel'),false);show('Enter a new password to finish account recovery.');}if(event==='SIGNED_OUT'){user=null;hidden(memberPanel,true);hidden(authPanel,false);}});
  refresh().catch(safeError);
})();
