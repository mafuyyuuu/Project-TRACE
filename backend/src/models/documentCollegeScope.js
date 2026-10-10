/** Fixed document alias; all college values remain parameterized. */
function documentCollegeScope({ collegeId, collegeName } = {}) {
  if (!collegeId && !collegeName) return { condition: '', params: [] };
  return {
    condition: `COALESCE(d.routing_college_id, (
      SELECT CASE WHEN COUNT(*) = 1 THEN MAX(COALESCE(student.college_id, c.id)) END
      FROM users student LEFT JOIN colleges c ON c.name = student.course AND c.is_active = TRUE
      WHERE student.student_id = d.student_id AND student.role = 'student'
    )) IN (SELECT id FROM colleges WHERE is_active = TRUE AND ${collegeId ? 'id = ?' : 'name = ?'})`,
    params: [collegeId || collegeName],
  };
}
module.exports = { documentCollegeScope };
