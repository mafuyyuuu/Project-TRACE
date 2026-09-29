const bcrypt = require('bcryptjs');
async function test() {
  const hash = await bcrypt.hash('Trace2024!', 10);
  const match = await bcrypt.compare('Trace2024!', hash);
  console.log(match);
}
test();
