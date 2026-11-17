begin;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,1,'Notice the Team at Its Best','LEARNING PURPOSE
A Stay Culture begins with careful attention to what already works. When a rush ends well, identify which behaviors created that result: a clear handoff, a calm correction, or a teammate noticing another''s need. Specific observations are more useful than broad praise. Strengths are evidence of capacity, not a reason to ignore workload problems.

APPLY IT IN THE RESTAURANT
During the next busy period, record two concrete examples of teamwork. Tell the people involved exactly what you noticed and ask what made the success possible.

PRACTICE EVIDENCE FOR REVIEW
Share one observable behavior and how the employee described it.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,2,'Ask Appreciative Questions','LEARNING PURPOSE
An appreciative question invites a story rather than a yes-or-no verdict. Ask when an employee felt trusted, supported, or proud, then listen for patterns and conditions. This approach does not suppress difficult information; it creates a safe route toward understanding what people value and what can be strengthened. Follow the answer with curiosity rather than a preselected solution.

APPLY IT IN THE RESTAURANT
Hold a five-minute conversation with a colleague. Ask for a recent moment when work felt meaningful. Listen without interrupting, then summarize what you heard.

PRACTICE EVIDENCE FOR REVIEW
Record the question, the person''s theme, and one leadership implication, without private identifying details.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,3,'Reframe Without Minimizing','LEARNING PURPOSE
Reframing moves from blame to a solvable question. ''Why is everybody careless?'' becomes ''When have our handoffs been accurate, and how can we repeat those conditions?'' A useful reframe still names the business impact and the standards that matter. Pairing a clear problem statement with curiosity protects accountability while opening possibilities for improvement.

APPLY IT IN THE RESTAURANT
Choose one recurring operational irritation. Write the impact in plain language, then rewrite the complaint as a question about effective practices and an achievable change.

PRACTICE EVIDENCE FOR REVIEW
Share the complaint, the constructive question, and the small experiment it suggests.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,4,'Run Small Strengths Experiments','LEARNING PURPOSE
Appreciative leadership becomes credible when it produces action. Name a useful strength, choose one visible behavior to amplify, set a short test period, and ask employees what they noticed. Keep the experiment small enough to learn from rather than declaring a permanent change before there is evidence. A brief before-and-after review builds shared ownership.

APPLY IT IN THE RESTAURANT
Run a seven-day experiment improving one handoff or recognition practice. Agree on a simple signal, such as fewer missed items or a clearer shift start.

PRACTICE EVIDENCE FOR REVIEW
Report the tested change, the signal you tracked, and employee observations.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,1,'Lead from Clear Values','LEARNING PURPOSE
Authentic leadership starts with knowing which principles should be visible under pressure. Choose two or three values, such as fairness, service, or honesty, and translate each into an observable action. Employees judge values by how managers schedule work, correct mistakes, and handle exceptions. Consistency matters more than slogans.

APPLY IT IN THE RESTAURANT
Write two leadership values and one behavior for each that an employee could actually see during a stressful shift.

PRACTICE EVIDENCE FOR REVIEW
Share a value-behavior pair and an example of acting on it.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,2,'Build Credibility Through Follow-Through','LEARNING PURPOSE
Credibility grows when leaders make realistic commitments, communicate changes, and close the loop. An unanswered request or unexplained scheduling change can erode trust even if it seems minor. If you cannot deliver, say so early, explain the reason, and offer the next responsible step. Reliability is a practice, not a personality trait.

APPLY IT IN THE RESTAURANT
Review a commitment you made to an employee. Complete it, or update the person with a clear timeline and explanation.

PRACTICE EVIDENCE FOR REVIEW
Share how you closed one loop and what changed in the relationship.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,3,'Serve Without Losing Accountability','LEARNING PURPOSE
Servant leadership asks what people need to succeed, then removes obstacles while upholding standards. It is not doing everyone''s work or avoiding consequences. Ask where the process, tools, staffing, or instruction are getting in the way; then clarify responsibility and offer support. Effective service combines care for people with care for the operation.

APPLY IT IN THE RESTAURANT
Ask a team member which obstacle consumes the most preventable time. Address one obstacle while confirming the standard you still expect.

PRACTICE EVIDENCE FOR REVIEW
Describe the obstacle, action taken, and accountable expectation.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,4,'Hold Healthy Boundaries','LEARNING PURPOSE
Leadership boundaries define what is fair, sustainable, and respectful. Caring for a team does not mean being permanently available or promising every request can be granted. Explain decision criteria, protect rest, and avoid favoritism. Boundaries create predictability; they also give employees a model for sustainable work and transparent decisions.

APPLY IT IN THE RESTAURANT
Choose one recurring boundary challenge such as late messages or last-minute swaps. State an equitable rule and how urgent exceptions will be handled.

PRACTICE EVIDENCE FOR REVIEW
Share the boundary and how you communicated it without blaming anyone.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,1,'Make It Safe to Speak','LEARNING PURPOSE
Psychological safety means employees can ask, clarify, and raise concerns without humiliation. It is not freedom from standards. A manager''s first response to bad news determines whether the next concern is surfaced or hidden. Thank the speaker, clarify facts, protect dignity, and act on the issue. A clear safety channel is especially important in food service.

APPLY IT IN THE RESTAURANT
In your next huddle, invite one suggestion or concern. Respond with curiosity and identify how and when you will follow up.

PRACTICE EVIDENCE FOR REVIEW
Share an example of making a concern safe to raise and what happened afterward.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,2,'Recognize Specific Contributions','LEARNING PURPOSE
Recognition works best when it is fair, timely, and connected to what the employee did. Not everyone prefers the same kind of praise; some value private thanks, schedule consideration, or a growth opportunity. Ask about preferences and look beyond the most visible employees. Recognition should acknowledge teamwork without turning every interaction into competition.

APPLY IT IN THE RESTAURANT
Recognize a contribution from someone whose work is usually behind the scenes. Use their preferred form of acknowledgment where practical.

PRACTICE EVIDENCE FOR REVIEW
Describe the contribution and why the recognition was appropriate.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,3,'Listen for Reasons People Stay','LEARNING PURPOSE
Retention begins before an exit interview. Stay interviews ask employees what makes their work rewarding, what might make them leave, and which changes would help them thrive. Listen for patterns rather than demanding loyalty. Managers cannot promise every improvement, but they can communicate which ideas are feasible and why. An honest response is part of the retention strategy.

APPLY IT IN THE RESTAURANT
Conduct one short stay conversation, asking what the employee values most and what would improve the experience. Agree on one feasible follow-up.

PRACTICE EVIDENCE FOR REVIEW
Share themes and a next action without exposing private employee information.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,4,'Build Belonging Across Shifts','LEARNING PURPOSE
Employees experience culture through inclusion in information, opportunity, and everyday routines. Day, evening, and weekend teams may have very different access to leadership. Belonging requires fair communication, newcomer support, and chances to contribute. Check whether shift patterns unintentionally exclude people from recognition or development.

APPLY IT IN THE RESTAURANT
Review how updates reach each shift. Make one adjustment so part-time or closing staff receive the same essential information and opportunity to respond.

PRACTICE EVIDENCE FOR REVIEW
Share the excluded group, communication change, and feedback received.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,1,'Coach with Curiosity','LEARNING PURPOSE
A coaching approach does not start by offering the manager''s preferred answer. Ask what the person wants to achieve, what they have tried, which strength could help, and what next step they will own. Offer direct instruction when safety or compliance requires it. Otherwise, curiosity can build judgment and confidence faster than solving every problem for the employee.

APPLY IT IN THE RESTAURANT
In one nonurgent coaching moment, ask at least two open questions before offering advice. End by naming the employee''s next step.

PRACTICE EVIDENCE FOR REVIEW
Share the questions, the employee''s chosen action, and what you learned.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,2,'Give Useful Developmental Feedback','LEARNING PURPOSE
Helpful feedback describes an observation, its impact, and an achievable next step. Avoid labels such as lazy or careless. Ask for the employee''s perspective before deciding what support is needed. Keep public feedback appreciative and deliver sensitive correction privately. Timely follow-up confirms that improvement matters more than fault-finding.

APPLY IT IN THE RESTAURANT
Prepare a private feedback conversation: situation, observable behavior, effect, employee perspective, specific next action, and follow-up date.

PRACTICE EVIDENCE FOR REVIEW
Share the behavioral feedback and agreed next step without naming the employee.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,3,'Delegate for Growth','LEARNING PURPOSE
Delegation is more than assigning tasks. State the outcome, limits, resources, decision authority, and check-in point. Choose development assignments that stretch without abandoning the person. A shift leader who can make supported decisions becomes a stronger successor and frees the GM to focus on systems rather than constant rescue.

APPLY IT IN THE RESTAURANT
Choose one safe responsibility to delegate. Clarify the desired result, authority limits, available help, and review point.

PRACTICE EVIDENCE FOR REVIEW
Share the responsibility, decision boundary, and what the employee learned.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,4,'Create Individual Growth Plans','LEARNING PURPOSE
Development should connect strengths and aspirations to specific practice. Ask employees about their goals, map the skills needed, offer a modest challenge, and schedule reflection. Promotions should not be the only form of growth; mastery, mentorship, and cross-training also matter. Plans need dates and evidence, not only encouragement.

APPLY IT IN THE RESTAURANT
Help one employee choose a 30-day development goal and two practice opportunities. Agree on a brief check-in.

PRACTICE EVIDENCE FOR REVIEW
Share the goal, planned practice, and how progress will be observed.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,1,'Notice Conflict Early','LEARNING PURPOSE
Conflict often begins with unclear expectations, pressure, or mismatched assumptions rather than bad intent. Notice changes in behavior, missed handoffs, and repeated frustration before positions harden. Describe what you see without diagnosing motives. Early private conversations preserve dignity and prevent a practical problem from becoming a relationship crisis.

APPLY IT IN THE RESTAURANT
Identify a low-level friction point. Ask each person separately what is happening and what the working relationship needs.

PRACTICE EVIDENCE FOR REVIEW
Share the observable issue, perspectives heard, and next constructive step.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,2,'Navigate Difficult Conversations','LEARNING PURPOSE
A productive difficult conversation begins with clear facts, a respectful purpose, and an invitation to respond. Describe the situation, explain the effect, and ask for the other person''s account. Listen without surrendering standards. End with a specific commitment and a follow-up. Private correction and documented expectations are especially important when a problem repeats.

APPLY IT IN THE RESTAURANT
Plan a conversation using observation, impact, curiosity, expectation, and review date. Rehearse a calm opening.

PRACTICE EVIDENCE FOR REVIEW
Share your opening statement and the specific agreed follow-up.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,3,'Transform Positions into Shared Needs','LEARNING PURPOSE
When people argue about positions, ask which needs those positions protect. A worker may demand a fixed schedule for predictability; a GM may resist because coverage is uncertain. Search for options that honor both interests where possible. Transformation does not mean forced harmony; some decisions remain constrained by fairness, law, or safety. Be transparent about limits.

APPLY IT IN THE RESTAURANT
Take a disagreement and write each person''s stated position, underlying need, and one option for testing a fair compromise.

PRACTICE EVIDENCE FOR REVIEW
Share needs, boundaries, and the proposal for moving forward.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,4,'Repair Trust After a Mistake','LEARNING PURPOSE
Repair begins with acknowledging what happened, owning your contribution, and making a specific change. An apology without changed behavior is quickly forgotten. Invite the affected person to describe the impact, avoid defensive justifications, and confirm the next action. Trust rebuilds through a sequence of small credible follow-throughs, not a single meeting.

APPLY IT IN THE RESTAURANT
Think of a recent leadership mistake. Where appropriate, acknowledge it privately, name the repair, and arrange a check-in.

PRACTICE EVIDENCE FOR REVIEW
Describe the acknowledgment and the behavior you will change.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,1,'Build Daily Culture Rituals','LEARNING PURPOSE
A culture becomes durable through repeated behaviors at the moments people already share. A brief strengths-based opening question, a clear shift handoff, and a genuine closing recognition can reinforce expectations without adding long meetings. Choose rituals that suit the restaurant and can survive busy days. Evaluate whether employees find them useful rather than ceremonial.

APPLY IT IN THE RESTAURANT
Design one two-minute ritual for a shift start or close. Define the question, who leads it, and when to review usefulness.

PRACTICE EVIDENCE FOR REVIEW
Share the ritual, its purpose, and how you will notice whether it helps.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,2,'Use Simple Culture Signals','LEARNING PURPOSE
Leaders need evidence about team experience as well as sales, speed, and safety. Use short, confidential pulse questions, stay-conversation themes, retention patterns, and observed behavior. Do not overinterpret one negative comment or promise anonymity you cannot protect. Tell employees what was learned and which practical change follows.

APPLY IT IN THE RESTAURANT
Select one nonidentifying culture signal and one operational signal to review over the next month.

PRACTICE EVIDENCE FOR REVIEW
Share the signals, starting condition, and what improvement would look like.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,3,'Learn Through Improvement Cycles','LEARNING PURPOSE
A 30/60/90-day rhythm turns culture into continuous learning. In the first period, discover strengths and needs; next, test employee-designed improvements; finally, review results, recognize contributions, and decide what to sustain. Name owners and decision dates. Stay willing to change a strategy if the evidence does not support it. Improvement is a shared process rather than a poster.

APPLY IT IN THE RESTAURANT
Choose one culture opportunity. Write a 30-day listening goal, a 60-day test, and a 90-day evidence review.

PRACTICE EVIDENCE FOR REVIEW
Share milestones, owners, and the result you will examine.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_lessons(module_id,position,title,body,published)
select m.id,4,'Build Your Leadership Portfolio and 90-Day Plan','LEARNING PURPOSE
Graduation is a demonstration of leadership practice, not just reading completion. Pull together evidence of appreciation, coaching, healthy accountability, conflict repair, and team development. Write a 90-day plan with priorities, actions, owners, review dates, and a measure of success. Invite a reviewer to challenge weak assumptions and celebrate real learning. Keep private reflections private and share only material appropriate for professional review.

APPLY IT IN THE RESTAURANT
Prepare a leadership statement, one example of practice from each major module, and a 30/60/90-day improvement plan. Submit a concise portfolio for assigned reviewer feedback.

PRACTICE EVIDENCE FOR REVIEW
Share your leadership statement, specific examples, milestones, measures, and a realistic first action.

REFLECTION
What strength is already present? Whose perspective have you not heard? Which single behavior will you test during the next seven days? What observable result would show progress?',false
from public.academy_modules m join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6
on conflict(module_id,position) do update set title=excluded.title,body=excluded.body,published=false;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'During a difficult dinner rush, a newer manager sees a team member quietly help two overwhelmed stations.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=1
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A reliable employee has become quiet in team huddles. The GM wants to learn what matters to them.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=2
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'The closing checklist is often incomplete, and the next shift loses time correcting it.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=3
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'Two managers propose different ideas for smoother shift change.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=4
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'An experienced worker asks to bypass a food-safety step to save time.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=1
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A manager promised to review an employee''s development request but became busy.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=2
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A new shift leader repeatedly misses a required temperature check.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=3
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'Two staff members request the same peak-time day off.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=4
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A new hire notices a possible allergen cross-contact mistake.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=1
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A quiet prep worker prevents a shortage through careful planning.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=2
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A capable team member is considering a different employer.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=3
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'New policies are explained only at the morning meeting, while the closing crew hears rumors.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=4
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A newly promoted lead asks how to organize a difficult opening shift.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=1
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A team member regularly arrives at a station without the needed supplies.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=2
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A manager wants a shift leader to coordinate break coverage.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=3
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'An employee wants to become a shift leader but lacks confidence.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=4
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'Two employees keep blaming each other for missing prep items.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=1
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A lead repeatedly corrects coworkers loudly in front of guests.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=2
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'One employee wants all weekends off while other employees demand equal rotation.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=3
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A GM blamed a team member for a scheduling error the GM actually made.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=4
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A GM wants to make appreciation part of every shift.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=1
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A manager wants to know whether new shift huddles help.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=2
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A team wants better onboarding and the GM asks for a practical plan.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=3
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_scenarios(lesson_id,position,prompt)
select l.id,1,'A manager finishes lessons and wants to claim graduation without any field practice.'
from public.academy_lessons l join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=4
on conflict(lesson_id,position) do update set prompt=excluded.prompt;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Say ''Great job, everyone'' and move on.','General praise is pleasant but does not help the team repeat a useful behavior.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Thank the individual for the precise help and ask what enabled it.','Specific appreciation uncovers the conditions and habits the team can reproduce.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Announce that teamwork is now mandatory.','A command without inquiry misses what made this help possible.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Ask what is wrong with their attitude.','Assuming an attitude problem turns a conversation into an accusation.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Ask when they have felt most supported here and what contributed to it.','A specific strengths-based question invites evidence and gives the employee voice.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Tell them they should be more positive.','Demanding positivity discourages honest information.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Tell the whole crew they never care.','Blame rarely reveals a reliable operational fix.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Identify a successful close and ask what helped the checklist get finished.','Studying a strong example can reveal workable timing, roles, and prompts.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Stop using the checklist.','Removing the standard hides the risk rather than solving the handoff.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Pick the louder manager''s idea immediately.','Authority alone does not establish which approach works.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Test one clearly defined handoff improvement for a week and review evidence.','A bounded test turns different ideas into shared learning.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Delay any change until everyone agrees perfectly.','Waiting for perfect consensus keeps a known problem unchanged.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=1 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Make an exception for the best performer.','Exceptions for favored employees undermine credibility and safety.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Hold the standard respectfully and explain its purpose.','A clear and respectful standard demonstrates values in action.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Ignore the request and avoid the conversation.','Avoidance leaves the employee without an accountable decision.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Avoid the employee until there is an answer.','Silence can make a manageable delay feel like disregard.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Acknowledge the delay and state when the review will happen.','An honest update repairs reliability even before the task is finished.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Say that career development is not a priority right now.','Dismissing the request damages the credibility of earlier commitments.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Complete the check for them indefinitely.','Doing the task forever prevents learning and masks a training gap.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Demonstrate the procedure, remove confusion, and set a follow-up expectation.','Teaching and follow-up serve the employee while protecting a standard.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Publicly shame them for incompetence.','Humiliation reduces confidence without improving the process.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Approve the request for the employee you like most.','Favoritism violates predictability and hurts trust.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Explain the scheduling criteria and apply them consistently.','Transparent criteria are kinder and more credible than arbitrary preference.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Promise both requests will work, then change the schedule secretly.','Unrealistic promises transfer conflict into the future.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=2 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Scold them for slowing service.','Public criticism teaches the team to hide risk.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Thank them for raising it, stop the unsafe step, and verify the procedure.','Safety and appreciation belong together when quality is at stake.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Tell them not to bother the team during a rush.','Speed must not override an allergen safety concern.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Only praise the cashier who received customer compliments.','Overlooking invisible work reinforces inequity.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Name the prep worker''s specific contribution and its impact.','Specific recognition connects contribution with meaningful impact.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Give an identical generic award to everyone regardless of work.','Generic recognition may miss individual effort and preference.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Ask them to promise they will not quit.','Pressure can discourage honest discussion and speed disengagement.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Ask what makes their role worthwhile and what change would help them stay.','A respectful stay interview offers useful information and preserves choice.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Explain that leaving would let the team down.','Guilt is not a retention strategy.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Assume the closing crew will learn eventually.','Important information should not depend on being present at one meeting.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Create an accessible shift handoff and invite questions from all teams.','Consistent communication signals respect across schedules.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Reprimand closing staff for not knowing the changes.','Punishing people for missing an inaccessible update damages belonging.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=3 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Give the full plan and tell them never to vary it.','Giving every answer can prevent ownership of routine decisions.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Ask what success would look like, what resources are available, and which step they would try first.','Guided questions let the lead practice practical judgment.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Tell them leadership should be instinctive.','Dismissal does not teach operational planning.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Say ''You are always unprepared.''','A character label is difficult to act on and easily feels unfair.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Describe the missed supplies, ask what interfered, and agree on a preparation check.','Specific observations and a joint next step support improvement.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Complain about them to coworkers.','Third-party criticism damages trust and offers no direct correction.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Give vague instructions and disappear.','Ambiguity creates preventable confusion and stress.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Explain staffing constraints, authority, and when to escalate an issue.','Clear boundaries make delegation a learning opportunity.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Keep all decisions with the GM because mistakes are possible.','Refusing reasonable delegation keeps potential leaders dependent.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Promise a promotion next month.','Unconditional promises create expectations without evidence.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Identify key skills, provide a stretch assignment, and set a review date.','Practice and feedback create a credible pathway to advancement.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Say they should wait until they seem ready.','Vague waiting gives no route for improvement.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=4 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Pick the person with longer tenure as the winner.','Tenure does not establish what caused a process failure.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Ask both about the handoff process and clarify shared expectations.','Early inquiry can separate facts, interpretations, and repair options.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Wait until an argument occurs in front of guests.','Delay allows distrust to accumulate.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Publicly embarrass the lead in return.','Retaliatory embarrassment reproduces the problem.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Meet privately, describe the incidents, ask their perspective, and set a respectful correction standard.','Private, specific feedback supports dignity and accountability.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Avoid the subject because the lead performs well.','Strong performance does not remove responsibility for conduct.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Treat the loudest request as automatically valid.','A one-sided decision without criteria is likely to deepen resentment.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Explore predictability and fairness needs, then evaluate transparent options against staffing constraints.','Understanding interests reveals options that positions alone obscure.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Tell both people to stop complaining.','Silencing discussion leaves the fairness concern unresolved.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Quietly change the schedule without mentioning the error.','A silent fix misses the relational damage.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Acknowledge the mistake, correct the record, and explain how future changes will be checked.','Owning an error and fixing the process demonstrate credibility.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Tell the employee to be less sensitive.','Defensiveness shifts responsibility to the harmed employee.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=5 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Schedule a required hour-long recognition meeting daily.','A heavy ritual may be abandoned during real service demands.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Use a brief shift-start question about what will help the team succeed.','A short, relevant habit has a better chance of surviving pressure.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Post a generic motivational quote and assume the work is complete.','A slogan is not the same as a practiced behavior.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=1 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Judge success by whether the manager personally enjoys them.','A leader''s preference is not evidence of team impact.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Ask employees a brief question and observe whether handoffs are clearer.','Employee experience and process data provide complementary signals.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Require every employee to give a perfect rating.','Coerced feedback makes the measure unreliable.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=2 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Launch five major changes with no owner or measure.','Uncoordinated changes make it difficult to learn what helped.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Interview recent hires, test one onboarding improvement, then review retention and feedback.','A phased cycle creates manageable action and evidence.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Wait until the next annual survey.','Delaying months wastes actionable feedback.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=3 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,1,'Declare completion because all pages have been opened.','Page views alone do not demonstrate leadership capability.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,2,'Submit evidence of applied behaviors and a measurable 90-day plan for review.','Applied evidence and a reviewable plan turn learning into commitments.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
insert into public.academy_choices(scenario_id,position,choice_text,feedback)
select s.id,3,'Copy a colleague''s plan without adapting it.','A copied plan ignores this team''s actual needs and strengths.'
from public.academy_scenarios s join public.academy_lessons l on l.id=s.lesson_id
join public.academy_modules m on m.id=l.module_id
join public.academy_courses c on c.id=m.course_id
where c.slug='stay-culture-leadership-academy' and m.position=6 and l.position=4 and s.position=1
on conflict(scenario_id,position) do update set choice_text=excluded.choice_text,feedback=excluded.feedback;
commit;