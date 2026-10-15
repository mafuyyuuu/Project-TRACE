const { badRequest } = require('./AppError');

const INPUT_LIMITS = Object.freeze({
  name: 255, email: 255, id: 50, phone: 13, program: 150,
  referenceName: 150, shortCode: 20, shortText: 255,
  receiptNumber: 100, notes: 2000, address: 500,
  password: 64, otp: 6, template: 100000,
});

const ACCOUNT_TEXT_LIMITS = Object.freeze({
  employee_id: INPUT_LIMITS.id, student_id: INPUT_LIMITS.id,
  full_name: INPUT_LIMITS.name, first_name: INPUT_LIMITS.name,
  middle_name: INPUT_LIMITS.name, last_name: INPUT_LIMITS.name,
  email: INPUT_LIMITS.email, course: INPUT_LIMITS.referenceName,
  program: INPUT_LIMITS.program, desk_assignment: 100,
});
const PROFILE_TEXT_LIMITS = Object.freeze({
  ...ACCOUNT_TEXT_LIMITS, extension_name: INPUT_LIMITS.shortCode,
  place_of_birth: INPUT_LIMITS.name, maiden_name: INPUT_LIMITS.name,
  home_address: INPUT_LIMITS.address, previous_school: INPUT_LIMITS.name,
  elem_school: INPUT_LIMITS.name, jhs_school: INPUT_LIMITS.name,
  shs_school: INPUT_LIMITS.name, year_level: INPUT_LIMITS.shortCode, section: INPUT_LIMITS.shortCode,
});

function validateTextFields(body, limits) {
  for (const [key, limit] of Object.entries(limits)) {
    const value = body[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string' || value.length > limit) {
      throw badRequest(`${key.replaceAll('_', ' ')} must be text of at most ${limit} characters.`);
    }
  }
}

module.exports = { INPUT_LIMITS, ACCOUNT_TEXT_LIMITS, PROFILE_TEXT_LIMITS, validateTextFields };
