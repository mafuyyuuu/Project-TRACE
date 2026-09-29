const fs = require('fs');
const file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

// Replace pool with sessionModel
content = content.replace(
  "const pool = require('../database/connection');",
  "const sessionModel = require('../models/session.model');"
);

// Replace pool.query with sessionModel functions
const targetSelect = /const \[sessions\] = await pool\.query\('SELECT \* FROM sessions WHERE user_id = \? AND device_fingerprint = \?', \[user\.id, device_fingerprint\]\);/;
const replaceSelect = `const session = await sessionModel.findSession(user.id, device_fingerprint, ip_address, user_agent);`;
content = content.replace(targetSelect, replaceSelect);

const targetInsert = /await pool\.query\('INSERT INTO sessions \(user_id, device_fingerprint, ip_address, user_agent\) VALUES \(\?, \?, \?, \?\)', \[user\.id, device_fingerprint, ip_address, user_agent\]\);/;
const replaceInsert = `await sessionModel.createSession(user.id, device_fingerprint, ip_address, user_agent);`;
content = content.replace(targetInsert, replaceInsert);

const targetCondition = /if \(sessions\.length === 0\) \{/;
const replaceCondition = `if (!session) {`;
content = content.replace(targetCondition, replaceCondition);

fs.writeFileSync(file, content);
