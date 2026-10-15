/** User-supplied PLP catalog, 15 October 2026. Additions only; no profile edits. */
const { pool } = require('../src/config/db');

const PROGRAMS = [
  ['Bachelor of Secondary Education major in English', 'College of Education'],
  ['Bachelor of Secondary Education major in Filipino', 'College of Education'],
  ['Bachelor of Secondary Education major in Mathematics', 'College of Education'],
  ['Bachelor of Elementary Education', 'College of Education'],
  ['BS Business Administration major in Marketing Management', 'College of Business and Accountancy'],
  ['BS Nursing', 'College of Nursing'],
  ['BS Hospitality Management', 'College of Hospitality Management'],
  ['BS Information Technology', 'College of Computer Studies'],
  ['BS Computer Science', 'College of Computer Studies'],
  ['AB Psychology', 'College of Arts and Sciences'],
  ['BS Electronics Engineering', 'College of Engineering'],
  ['BS Entrepreneurship', 'College of Business and Accountancy'],
  ['BS Accountancy', 'College of Business and Accountancy'],
];
const normalize = value => value.trim().replace(/\s+/g, ' ').toLowerCase();

async function migrate(executor) {
  const connection = executor || await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [colleges] = await connection.query('SELECT id, name FROM colleges ORDER BY id FOR UPDATE');
    const resolved = PROGRAMS.map(([name, collegeName]) => {
      const aliases = [collegeName];
      if (collegeName === 'College of Hospitality Management') aliases.push('College of International Hospitality Management');
      const candidates = colleges.filter(college => aliases.some(alias => normalize(alias) === normalize(college.name)));
      if (candidates.length !== 1) throw new Error(`Resolve the missing or ambiguous college before importing programs: ${collegeName}`);
      return { name, college_id: candidates[0].id, college_name: candidates[0].name };
    });
    // Lock colleges before programs, matching catalog and registration writes.
    const [existing] = await connection.query('SELECT college_id, name FROM programs ORDER BY college_id, id FOR UPDATE');
    let added = 0;
    for (const program of resolved) {
      if (existing.some(row => String(row.college_id) === String(program.college_id) && normalize(row.name) === normalize(program.name))) continue;
      await connection.query('INSERT INTO programs (college_id, name) VALUES (?, ?)', [program.college_id, program.name]);
      added += 1;
    }
    await connection.commit();
    return { added, programs: resolved };
  } catch (error) { await connection.rollback(); throw error; }
  finally { if (!executor) connection.release(); }
}

if (require.main === module) migrate().then(result => {
  console.table(result.programs);
  console.log(`Signup program catalog complete. Added ${result.added} programs; existing entries and activation states preserved.`);
}).catch(error => { console.error('Signup program catalog failed:', error.message); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrate, PROGRAMS };
