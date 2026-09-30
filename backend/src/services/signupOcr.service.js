const fs = require('fs/promises');
const aiEngine = require('./aiEngine.service');
const referenceModel = require('../models/referenceData.model');
const { badRequest } = require('../utils/AppError');

async function extractIdentity(file) {
  if (!file) throw badRequest('Choose an ID proof first.');
  try {
    const result = await aiEngine.extractIdentity(file);
    if (!result?.success) return { success: false, message: 'Could not read this ID. Enter the details manually.' };
    const data = result.extracted_data || {};
    const text = (value, limit) => typeof value === 'string' && value.length <= limit ? value.trim() : null;
    const collegeName = text(data.college_name, 150);
    const colleges = collegeName ? await referenceModel.findCollegeByName(collegeName) : [];
    const college = colleges.find(row => row.name === collegeName && row.is_active);
    return { success: true, student_id: text(data.student_id, 50), alumni_id: text(data.alumni_id, 50),
      full_name: text(data.full_name, 255), college_id: college?.id || null,
      message: 'Review the extracted details. Fill any missing information manually.' };
  } finally {
    await fs.unlink(file.path).catch(err => { if (err.code !== 'ENOENT') console.warn('Could not remove temporary ID scan.'); });
  }
}
module.exports = { extractIdentity };
