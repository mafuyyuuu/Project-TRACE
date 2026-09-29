const express = require('express');
const multer = require('multer');
const aiEngine = require('../services/aiEngine.service');

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

router.post('/extract-id', upload.single('id_proof'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  
  try {
    // The Python aiEngine.extractDocument uses 'document' field name
    // Let's create a custom function in aiEngine or just use extractDocument
    const result = await aiEngine.extractDocument(req.file, { trackingNumber: 'SIGNUP' });
    if (!result || !result.success) {
      return res.status(422).json({ success: false, message: 'Could not parse ID proof.' });
    }
    
    // We expect student_id to be extracted
    const student_id = result.extracted_data?.student_id || null;
    const course = null; // Wait, does the OCR extract course? verifyIdDocument does 3-point check.
    
    // Attempt basic regex on raw_text for common patterns just in case
    let raw = result.raw_text || '';
    let extractedStudentId = student_id;
    if (!extractedStudentId) {
      const match = raw.match(/STU\d{7}/i) || raw.match(/\d{4}-\d{5}/) || raw.match(/\d{2}-\d{4}-\d{3}/);
      if (match) extractedStudentId = match[0];
    }
    
    // Extract ALUMNI id
    let alumniId = null;
    const alMatch = raw.match(/ALU\d{7}/i);
    if (alMatch) alumniId = alMatch[0];

    res.json({
      success: true,
      student_id: extractedStudentId,
      alumni_id: alumniId,
      raw_text: raw
    });
  } catch (err) {
    console.error('AI Extract Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during OCR.' });
  }
});

module.exports = router;
