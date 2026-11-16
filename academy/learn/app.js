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
  let db, user, enrollment;
  const safeError = e => show(e?.message || 'Please retry the action.',true);
  if(!cfg.supabaseUrl || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl)
    || !cfg.publishableKey || /service_role|sb_secret_|^sk_/.test(cfg.publishableKey)) {
    show('The Academy learner portal is not yet configured for enrollment. No registration or charges are available here.');
    return;
  }
  if(!window.supabase?.createClient){show('Unable to load the secure sign-in service. Refresh and try again.',true);return;}
  db = window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const read = async (table, query) => {const {data,error}=await query(db.from(table));if(error)throw error;return data||[];};
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
      const {error}=await db.auth.signUp({email,password});
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
  async function refresh(){
    const {data:{user:next},error}=await db.auth.getUser();
    if(error && error.name!=='AuthSessionMissingError')throw error;
    user=next||null;
    hidden(authPanel,!!user);hidden(memberPanel,!user);
    hidden(detail,true);hidden(lessonsNode,true);
    if(!user){show('Sign in to access an active Academy enrollment.');return;}
    $('userLabel').textContent=user.email||'Signed in';
    show('Signed in securely. Loading your enrollment…');
    await loadCourses();await loadReviews();
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
  async function loadLessons(e,course){
    enrollment=e; hidden(lessonsNode,false);hidden(detail,true);
    lessonsNode.replaceChildren(elt('h2',course.title));
    const modules=await read('academy_modules',q=>q.select('id,title,position').eq('course_id',course.id).order('position'));
    const progress=await read('academy_lesson_progress',q=>q.select('lesson_id').eq('enrollment_id',e.id));
    const done=new Set(progress.map(p=>p.lesson_id));
    for(const module of modules){
      const h=elt('h3',module.title); lessonsNode.append(h);
      const lessons=await read('academy_lessons',q=>q.select('id,title,body,position').eq('module_id',module.id).eq('published',true).order('position'));
      for(const l of lessons){
        const row=elt('div',undefined,'academy-lesson');
        row.append(elt('span',(done.has(l.id)?'✓ ':'○ ')+l.title));
        row.append(button('Study lesson',()=>openLesson(l,done.has(l.id)).catch(safeError),true));
        lessonsNode.append(row);
      }
    }
  }
  async function openLesson(l,completed){
    hidden(detail,false);detail.replaceChildren(elt('h2',l.title));
    const body=elt('div');body.style.whiteSpace='pre-wrap';body.textContent=l.body;detail.append(body);
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
    const label=elt('label','My private reflection (not shared with reviewers)');
    const input=elt('textarea',undefined,'academy-input');
    input.rows=5;input.value=notes[0]?.body||'';label.append(input);detail.append(label);
    detail.append(button('Save private reflection',async()=>{
      try{
        const {error}=await db.from('academy_private_reflections').upsert({enrollment_id:enrollment.id,lesson_id:l.id,body:input.value,modified_at:new Date().toISOString()},{onConflict:'enrollment_id,lesson_id'});
        if(error)throw error;show('Your private reflection was saved.');
      }catch(e){safeError(e);}
    }));
    const existing=await read('academy_submissions',q=>q.select('body').eq('enrollment_id',enrollment.id).eq('lesson_id',l.id));
    const submitLabel=elt('label','Practice submission (visible to your assigned reviewer)');
    const submission=elt('textarea',undefined,'academy-input');submission.rows=4;submission.value=existing[0]?.body||'';
    submitLabel.append(submission);detail.append(submitLabel);
    detail.append(button('Share practice submission',async()=>{
      try{
        if(!submission.value.trim())return show('Enter a practice response before submitting.',true);
        const {error}=await db.from('academy_submissions').upsert({enrollment_id:enrollment.id,lesson_id:l.id,body:submission.value},{onConflict:'enrollment_id,lesson_id'});
        if(error)throw error;show('Your practice response was shared with your assigned reviewer.');
      }catch(e){safeError(e);}
    }));
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
  db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){user=null;hidden(memberPanel,true);hidden(authPanel,false);}});
  refresh().catch(safeError);
})();
