-- Unpublished Academy curriculum shell: editorial framework only, not approved lessons.
-- No empty lesson placeholders and no customer access are created.
insert into public.academy_courses(slug,title,published)
values ('stay-culture-leadership-academy','Stay Culture Leadership Academy',false)
on conflict (slug) do update set title=excluded.title, published=false;

with course as (
  select id from public.academy_courses where slug='stay-culture-leadership-academy'
), module_names(position,title) as (
  values
  (1,'Appreciative and Strengths-Based Leadership'),
  (2,'Authentic and Servant Leadership'),
  (3,'Trust, Belonging, and Retention'),
  (4,'Coaching Conversations and Growth'),
  (5,'Conflict Transformation and Difficult Conversations'),
  (6,'Practicing and Sustaining a Stay Culture')
)
insert into public.academy_modules(course_id,position,title)
select course.id,module_names.position,module_names.title
from course cross join module_names
on conflict(course_id,position) do update set title=excluded.title;
