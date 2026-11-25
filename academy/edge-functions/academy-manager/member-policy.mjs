// Pure, side-effect-free policy/aggregation for Academy owner/GM team management.
// Never accept a client-supplied actor role: use the authenticated server-side membership.
export function canDeactivateMember(actorRole, targetRole, targetIsBillingOwner) {
  if (targetIsBillingOwner || targetRole === "owner") return false;
  if (actorRole === "owner") return ["gm", "manager", "shift_leader"].includes(targetRole);
  if (actorRole === "gm") return ["manager", "shift_leader"].includes(targetRole);
  return false;
}
export function summarizeTeamProgress(locationId, members, enrollments, courses, modules, lessons, progressRows) {
  const courseById = new Map(courses.map(c => [c.id, c]));
  const courseForModule = new Map(modules.map(m => [m.id, m.course_id]));
  const publishedByCourse = new Map();
  for (const lesson of lessons) {
    if (!lesson.published) continue;
    const courseId = courseForModule.get(lesson.module_id);
    if (!courseId || !courseById.has(courseId)) continue;
    if (!publishedByCourse.has(courseId)) publishedByCourse.set(courseId, new Set());
    publishedByCourse.get(courseId).add(lesson.id);
  }
  const activeUsers = new Set(members.filter(m => m.active).map(m => m.user_id));
  const allowedEnrollments = enrollments.filter(e =>
    e.location_id === locationId && activeUsers.has(e.user_id) && courseById.has(e.course_id));
  const byId = new Map(allowedEnrollments.map(e => [e.id, e]));
  const completedByEnrollment = new Map();
  for (const row of progressRows) {
    const enrollment = byId.get(row.enrollment_id);
    if (!enrollment || !publishedByCourse.get(enrollment.course_id)?.has(row.lesson_id)) continue;
    if (!completedByEnrollment.has(enrollment.id)) completedByEnrollment.set(enrollment.id, new Set());
    completedByEnrollment.get(enrollment.id).add(row.lesson_id);
  }
  const byUser = new Map();
  for (const e of allowedEnrollments) {
    const course = courseById.get(e.course_id);
    if (!byUser.has(e.user_id)) byUser.set(e.user_id, []);
    byUser.get(e.user_id).push({
      course_id: e.course_id,
      course_title: course.title,
      status: e.status,
      lessons_completed: completedByEnrollment.get(e.id)?.size || 0,
      lessons_total: publishedByCourse.get(e.course_id)?.size || 0
    });
  }
  return members.map(m => ({
    user_id: m.user_id, role: m.role, active: m.active, added_at: m.added_at,
    progress: m.active ? (byUser.get(m.user_id) || []) : []
  }));
}
