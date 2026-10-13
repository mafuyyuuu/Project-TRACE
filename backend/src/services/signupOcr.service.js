const fs = require('fs/promises');
const aiEngine = require('./aiEngine.service');
const referenceModel = require('../models/referenceData.model');
const { badRequest } = require('../utils/AppError');

const FAILURE_MESSAGES = {
  busy: 'The ID reader is processing another image. Retry shortly, or enter the details manually.',
  timeout: 'Reading this ID took too long. Try a cropped photo showing the ID clearly, or enter the details manually.',
  unavailable: 'The ID reader is temporarily unavailable. Try again later, or enter the details manually.',
  no_text: 'No readable text was detected. Try an upright photo cropped to the ID, or enter the details manually.',
  no_fields: 'The reader returned no recognizable ID fields. Enter the details manually.',
  invalid_image: 'The reader could not decode this image. Try a JPEG or PNG photo, or enter the details manually.',
  ambiguous: 'More than one candidate ID or name was detected. Enter the correct details manually.',
  engine_failure: 'The ID reader could not process this image. Retry or enter the details manually.',
};
function failure(reason) {
  const safe = Object.hasOwn(FAILURE_MESSAGES, reason) ? reason : 'unavailable';
  return { success:false, failure_reason:safe, message:FAILURE_MESSAGES[safe] };
}
async function extractIdentity(file) {
  if (!file) throw badRequest('Choose an ID proof first.');
  try {
    const result = await aiEngine.extractIdentity(file);
    if (!result?.success) return failure(result?.failure_reason || (result ? 'no_fields' : 'unavailable'));
    const data = result.extracted_data || {};
    const text = (value, limit) => typeof value === 'string' && value.length <= limit ? value.trim() || null : null;
    const collegeName = text(data.college_name, 150);
    const colleges = collegeName ? await referenceModel.findCollegeByName(collegeName) : [];
    const college = colleges.find(row => typeof row.name === 'string' && row.name.trim().toLowerCase() === collegeName.toLowerCase() && Number(row.is_active) === 1);
    const extracted = {
      student_id:text(data.student_id,50), alumni_id:text(data.alumni_id,50),
      full_name:text(data.full_name,255), first_name:text(data.first_name,255), middle_name:text(data.middle_name,255), last_name:text(data.last_name,255), college_id:college?.id || null,
    };
    if (!Object.values(extracted).some(Boolean)) return failure('no_fields');
    return { success:true, ...extracted, message:'Review the extracted details. Fill any missing information manually.' };
  } finally {
    await fs.unlink(file.path).catch(err => { if (err.code !== 'ENOENT') console.warn('Could not remove temporary ID scan.'); });
  }
}
module.exports = { extractIdentity };
