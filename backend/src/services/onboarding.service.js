const model = require('../models/onboarding.model');

async function start(user) {
  // Staff had no guide enrollment before this feature. INSERT IGNORE never
  // resets an existing display marker, including a concurrent browser claim.
  if (['admin', 'clerk'].includes(user.role)) await model.enroll(user.id);
  return model.claim(user.id);
}
module.exports = { start };
