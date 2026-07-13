const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { UniSmsClient } = require('@taliffsss/unisms');

const unismsClient = new UniSmsClient(process.env.UNISMS_SECRET_KEY || 'sk_zrEZ0VkIj8LqwivWlnxNF8RlUhkmjXIZ_nKRD3siLta4rChZT8maVBip_bcwDohSy7S43g4OdNf4RNBC3nilNA-1573');

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, true);
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extMatch = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeMatch = allowedTypes.test(file.mimetype);
    if (extMatch || mimeMatch) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and Word documents are allowed.'));
    }
  },
});

/**
 * POST /upload
 * Upload a document. Generates a tracking number, inserts into DB,
 * creates a step_log entry, and optionally forwards to the Python OCR engine.
 */
router.post('/upload', authenticate, upload.single('document'), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Generate unique tracking number
    const trackingNumber = 'TRC-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const { student_id, student_name, document_type, purpose, copies, semesters } = req.body;
    const copiesInt = parseInt(copies) || 1;
    const semestersInt = parseInt(semesters) || 8;
    
    let baseAmount = 50.00;
    if (document_type === 'Transcript of Records' || document_type === 'Transcript of Records (TOR)') {
      baseAmount = Math.ceil(semestersInt / 4) * 100.00;
    } else if (document_type === 'Honorable Dismissal') {
      baseAmount = 100.00;
    }
    const finalAmount = baseAmount * copiesInt;

    const filePath = req.file ? req.file.path : null;
    const originalFilename = req.file ? req.file.originalname : null;

    await connection.beginTransaction();

    let initialStatus = 'pending_payment';
    let initialPaymentStatus = 'UNPAID';
    let logAction = 'submitted';
    let logNotes = `Document requested. Awaiting payment of ₱${finalAmount}.`;

    if (req.user && req.user.role === 'clerk' && req.user.desk_assignment === 'Window 1') {
      initialStatus = 'pending_secretary';
      initialPaymentStatus = 'PAID';
      logAction = 'manual_intake';
      logNotes = `Legacy record manually digitized by Window 1.`;
    }

    // Insert document record
    const [docResult] = await connection.query(
      `INSERT INTO documents (tracking_number, student_id, student_name, document_type,
        current_status, payment_status, assigned_clerk_id, file_path, original_filename, checkout_url, purpose, copies, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trackingNumber,
        student_id || null,
        student_name || null,
        document_type || null,
        initialStatus,
        initialPaymentStatus,
        req.user.id,
        filePath,
        originalFilename,
        `https://pm.link/mock/${trackingNumber}`,
        purpose || null,
        copiesInt,
        finalAmount
      ]
    );

    const documentId = docResult.insertId;

    // Create initial step_log entry
    await connection.query(
      `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
       VALUES (?, ?, ?, NULL, ?, ?)`,
      [documentId, req.user.id, logAction, initialStatus, logNotes]
    );

    await connection.commit();

    // Fetch the inserted document
    const [docRows] = await pool.query(
      'SELECT * FROM documents WHERE id = ?',
      [documentId]
    );

    // Await Python OCR engine ONLY if file exists
    if (filePath) {
      const aiEngineUrl = 'http://127.0.0.1:5005';
      try {
        const fs = require('fs');
        const FormData = require('form-data');

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('tracking_number', trackingNumber);

        const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
        const ocrRes = await fetchFn(`${aiEngineUrl}/ocr/extract`, {
          method: 'POST',
          body: form,
          headers: form.getHeaders ? form.getHeaders() : {},
        });

        if (ocrRes.ok) {
          const ocrData = await ocrRes.json();
          console.log(`📄 OCR processing complete for ${trackingNumber}`);
          
          if (ocrData.success && ocrData.extracted_data) {
            const rawText = (ocrData.raw_text || '').toLowerCase();
            let aiVerified = false;
            let aiNotes = 'AI analyzed the document but could not definitively verify it.';
            
            // Basic AI Requirement Verification Logic
            if (document_type === 'Honorable Dismissal' && rawText.includes('clearance')) {
              aiVerified = true;
              aiNotes = 'AI Verified: Valid Clearance document detected for Honorable Dismissal.';
            } else if (rawText.includes(document_type.toLowerCase())) {
              aiVerified = true;
              aiNotes = `AI Verified: Document content matches requested type (${document_type}).`;
            }

            // Calculate mock confidence score if not provided
            const confidence = ocrData.confidence || (aiVerified ? 92.5 : 45.0);

            await pool.query(
              `UPDATE documents SET 
                ocr_raw_text = ?, 
                ocr_extracted_data = ?, 
                ocr_confidence_score = ?,
                student_id = COALESCE(?, student_id), 
                document_type = COALESCE(?, document_type) 
               WHERE id = ?`,
              [
                ocrData.raw_text,
                JSON.stringify(ocrData.extracted_data),
                confidence,
                ocrData.extracted_data.student_id,
                ocrData.extracted_data.form_type,
                documentId
              ]
            );

            // Add an AI verification step log
            await pool.query(
              `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
               VALUES (?, ?, ?, 'pending_payment', 'pending_payment', ?)`,
              [documentId, req.user.id, aiVerified ? 'ai_verified' : 'ai_flagged', aiNotes]
            );

            const [updatedRows] = await pool.query('SELECT * FROM documents WHERE id = ?', [documentId]);
            docRows[0] = updatedRows[0];
          }
        }
      } catch (ocrErr) {
        console.warn(`⚠️ OCR engine unavailable or failed for ${trackingNumber}:`, ocrErr.message);
      }
    }

    // Trigger n8n webhook for routing
    try {
      const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
      await fetchFn('http://localhost:5678/webhook/route-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          tracking_number: trackingNumber,
          document_type: docRows[0].document_type,
          student_id: docRows[0].student_id,
        })
      });
      console.log(`🔀 Triggered n8n routing for ${trackingNumber}`);
    } catch (n8nErr) {
      console.warn(`⚠️ n8n webhook unavailable:`, n8nErr.message);
    }

    res.status(201).json({
      message: 'Document uploaded successfully.',
      tracking_number: trackingNumber,
      document: docRows[0],
    });
  } catch (err) {
    await connection.rollback();
    console.error('Document upload error:', err);
    res.status(500).json({ error: 'Failed to upload document.' });
  } finally {
    connection.release();
  }
});

/**
 * GET /
 * List documents. Clerks see only their assigned docs; admins see all.
 * Supports ?status= filter.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 500;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM documents';
    let countQuery = 'SELECT COUNT(*) as total FROM documents';
    const params = [];
    const conditions = [];

    // 1. Role-based scoping
    if (req.user.role === 'student') {
      const [u] = await pool.query('SELECT student_id FROM users WHERE id = ?', [req.user.id]);
      if (u.length > 0) {
        conditions.push('student_id = ?');
        params.push(u[0].student_id);
      } else {
        conditions.push('1 = 0');
      }
    } else if (req.user.role === 'clerk') {
      const desk = req.user.desk_assignment;
      if (status) {
        conditions.push('current_status = ?');
        params.push(status);
      } else {
        if (desk === 'Finance') {
          conditions.push('current_status = "pending_payment_verification"');
        } else if (desk === 'Secretary') {
          conditions.push('current_status IN ("pending_secretary", "ready_window_1", "completed", "released")');
        } else if (desk === 'Window 1') {
          // Window 1 can now see the entire system queue
        }
      }
    } else if (req.user.role === 'admin') {
      if (status) {
        conditions.push('current_status = ?');
        params.push(status);
      }
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0].total;

    params.push(limit, offset);
    const [rows] = await pool.query(query, params);

    res.json({
      documents: rows,
      total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Failed to retrieve documents.' });
  }
});

/**
 * GET /stats
 * Dashboard KPI stats for the authenticated user.
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const desk = req.user.desk_assignment;
    const userId = req.user.id;
    
    // Count documents processed today by current user
    const [processedToday] = await pool.query(
      `SELECT COUNT(DISTINCT sl.document_id) as count 
       FROM step_logs sl 
       WHERE sl.clerk_id = ? AND DATE(sl.timestamp_started) = CURDATE()`,
      [userId]
    );

    // Count documents cleared by secretary today (for Window 1 view)
    const [clearedBySecToday] = await pool.query(
      `SELECT COUNT(*) as count FROM step_logs 
       WHERE action_taken = 'secretary_approved' AND DATE(timestamp_started) = CURDATE()`
    );

    // Average processing time in minutes (from submitted to completed)
    const [avgTime] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, 
        (SELECT MIN(sl2.timestamp_started) FROM step_logs sl2 WHERE sl2.document_id = d.id),
        (SELECT MAX(sl3.timestamp_started) FROM step_logs sl3 WHERE sl3.document_id = d.id)
       )) as avg_minutes
       FROM documents d WHERE d.current_status IN ('completed', 'released')`
    );

    // Average OCR confidence
    const [avgConfidence] = await pool.query(
      `SELECT AVG(ocr_confidence_score) as avg_confidence FROM documents WHERE ocr_confidence_score IS NOT NULL`
    );

    // Backlog count
    const [backlog] = await pool.query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status IN ('pending_payment', 'pending_payment_verification', 'pending_secretary', 'ready_window_1')`
    );

    // Per-status counts for cross-scope KPI cards
    const [pendingVerificationCount] = await pool.query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status = 'pending_payment_verification'`
    );
    const [completedTodayCount] = await pool.query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status IN ('completed', 'released') AND DATE(updated_at) = CURDATE()`
    );
    const [pendingSecCount] = await pool.query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status = 'pending_secretary'`
    );
    const [readyW1Count] = await pool.query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status = 'ready_window_1'`
    );

    res.json({
      processed_today: processedToday[0].count || 0,
      cleared_by_secretary_today: clearedBySecToday[0].count || 0,
      avg_processing_minutes: parseFloat(avgTime[0].avg_minutes) || 0,
      avg_ocr_confidence: parseFloat(avgConfidence[0].avg_confidence) || 0,
      backlog_count: backlog[0].count || 0,
      pending_secretary_count: pendingSecCount[0].count || 0,
      ready_window_1_count: readyW1Count[0].count || 0,
      pending_payment_verification_count: pendingVerificationCount[0].count || 0,
      completed_today_count: completedTodayCount[0].count || 0
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

/**
 * GET /stats/forecast
 * Proxy to Flask AI engine for Prophet forecast, with fallback mock data.
 */
router.get('/stats/forecast', authenticate, async (req, res) => {
  try {
    const aiEngineUrl = 'http://127.0.0.1:5005';
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
    
    try {
      const aiRes = await fetchFn(`${aiEngineUrl}/forecast`, { method: 'GET' });
      if (aiRes.ok) {
        const data = await aiRes.json();
        return res.json(data);
      }
    } catch (err) {
      console.error(`AI forecast fetch failed at ${aiEngineUrl}/forecast:`, err.message, err.cause);
      console.error('AI forecast unavailable:', err.message);
    }

    // Fallback: generate forecast from historical step_logs data
    const [rows] = await pool.query(
      `SELECT DATE(timestamp_started) as date, COUNT(*) as volume 
       FROM step_logs 
       WHERE timestamp_started >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) 
       GROUP BY DATE(timestamp_started) 
       ORDER BY date DESC LIMIT 7`
    );

    const today = new Date();
    const forecast = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const historicalMatch = rows.find(r => new Date(r.date).getDay() === d.getDay());
      forecast.push({
        date: d.toISOString().split('T')[0],
        day: dayNames[d.getDay()],
        predicted_volume: historicalMatch ? historicalMatch.volume + Math.floor(Math.random() * 5) : Math.floor(Math.random() * 20) + 10
      });
    }

    res.json({ forecast, source: 'fallback' });
  } catch (err) {
    console.error('Forecast error:', err);
    res.status(500).json({ error: 'Failed to fetch forecast.' });
  }
});

/**
 * GET /stats/insights
 * Proxy to Flask AI engine for Random Forest insights, with fallback.
 */
router.get('/stats/insights', authenticate, async (req, res) => {
  try {
    const aiEngineUrl = 'http://127.0.0.1:5005';
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
    
    try {
      const aiRes = await fetchFn(`${aiEngineUrl}/ai/recommend`, { method: 'GET' });
      if (aiRes.ok) {
        const data = await aiRes.json();
        return res.json(data);
      }
    } catch (err) {
      console.error(`AI insights fetch failed at ${aiEngineUrl}/ai/recommend:`, err.message, err.cause);
      console.error('AI insights unavailable:', err.message);
    }

    // Fallback: generate insights from current queue data
    const [pendingSec] = await pool.query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status = 'pending_secretary'`
    );
    const [pendingRelease] = await pool.query(
      `SELECT COUNT(*) as count FROM documents WHERE current_status = 'ready_window_1'`
    );
    const [todayVolume] = await pool.query(
      `SELECT COUNT(*) as count FROM step_logs WHERE DATE(timestamp_started) = CURDATE()`
    );

    const insights = [];
    
    if (pendingSec[0].count > 5) {
      insights.push({
        type: 'warning',
        title: 'Secretary Queue Alert',
        message: `There are ${pendingSec[0].count} documents pending secretary evaluation. Consider prioritizing the evaluation queue to prevent bottleneck delays.`
      });
    }
    if (pendingRelease[0].count > 3) {
      insights.push({
        type: 'action',
        title: 'Release Desk Advisory',
        message: `${pendingRelease[0].count} documents are ready for student pickup at Window 1. Notify students via SMS to reduce queue wait times.`
      });
    }
    if (todayVolume[0].count > 20) {
      insights.push({
        type: 'warning',
        title: 'High Volume Day',
        message: `${todayVolume[0].count} document actions logged today. This is higher than average. Consider deploying additional clerk resources.`
      });
    }
    
    if (insights.length === 0) {
      insights.push(
        { type: 'info', title: 'System Normal', message: 'All queues are operating within normal parameters. No prescriptive actions needed at this time.' },
        { type: 'action', title: 'Optimization Tip', message: 'Current throughput is healthy. Run mock_data_gen.py to seed historical data and enable more accurate Prophet forecasting.' }
      );
    }

    res.json({ insights, source: 'fallback' });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: 'Failed to fetch insights.' });
  }
});

/**
 * GET /:trackingNumber
 * Public endpoint for tracking a document by its tracking number.
 * Returns the document details and all associated step_logs.
 */
router.get('/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    // Fetch the document
    const [docRows] = await pool.query(
      'SELECT * FROM documents WHERE tracking_number = ?',
      [trackingNumber]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const document = docRows[0];

    // Fetch associated step logs ordered by timestamp
    const [logRows] = await pool.query(
      `SELECT sl.id, sl.action_taken, sl.from_status, sl.to_status,
              sl.timestamp_started, sl.timestamp_completed, sl.notes,
              u.full_name AS clerk_name, u.desk_assignment
       FROM step_logs sl
       LEFT JOIN users u ON sl.clerk_id = u.id
       WHERE sl.document_id = ?
       ORDER BY sl.timestamp_started ASC`,
      [document.id]
    );

    res.json({
      document,
      step_logs: logRows,
    });
  } catch (err) {
    console.error('Track document error:', err);
    res.status(500).json({ error: 'Failed to retrieve document tracking info.' });
  }
});

/**
 * POST /assign
 * Internal endpoint called by n8n to assign a document to a specific clerk.
 * Expects { document_id, assigned_clerk_employee_id }
 */
router.post('/assign', async (req, res) => {
  try {
    const { document_id, assigned_clerk_employee_id } = req.body;
    
    if (!document_id || !assigned_clerk_employee_id) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Look up the numeric ID for the clerk
    const [clerkRows] = await pool.query(
      'SELECT id FROM users WHERE student_id = ?',
      [assigned_clerk_employee_id]
    );

    if (clerkRows.length === 0) {
      return res.status(404).json({ error: `Clerk ${assigned_clerk_employee_id} not found.` });
    }

    const assigned_clerk_id = clerkRows[0].id;

    const [updateResult] = await pool.query(
      'UPDATE documents SET assigned_clerk_id = ?, current_status = "processing" WHERE id = ?',
      [assigned_clerk_id, document_id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Log the assignment
    await pool.query(
      `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
       VALUES (?, NULL, 'routed', 'submitted', 'processing', ?)`,
      [document_id, `Auto-routed to Clerk ${assigned_clerk_employee_id} by n8n`]
    );

    res.json({ message: 'Document successfully assigned.' });
  } catch (err) {
    console.error('Assign document error:', err);
    res.status(500).json({ error: 'Failed to assign document.' });
  }
});

/**
 * POST /:id/action
 * Allow a clerk to approve or reject a document assigned to them.
 */
router.post('/:id/action', authenticate, async (req, res) => {
  try {
    const documentId = req.params.id;
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Ensure the document exists and is assigned to this clerk (or admin)
      const [docRows] = await connection.query(
        'SELECT * FROM documents WHERE id = ? FOR UPDATE',
        [documentId]
      );

      if (docRows.length === 0) {
        throw new Error('Document not found.');
      }

      const document = docRows[0];

      if (req.user.role === 'clerk' && document.assigned_clerk_id !== req.user.id) {
        throw new Error('You do not have permission to process this document.');
      }

      // Update the document
      await connection.query(
        'UPDATE documents SET current_status = ?, assigned_clerk_id = NULL WHERE id = ?',
        [newStatus, documentId]
      );

      // Log the action
      await connection.query(
        `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          documentId,
          req.user.id,
          action,
          document.current_status,
          newStatus,
          `Document ${newStatus} by ${req.user.full_name}`,
        ]
      );

      await connection.commit();
      res.json({ message: `Document successfully ${newStatus}.` });
    } catch (err) {
      await connection.rollback();
      if (err.message === 'Document not found.' || err.message === 'You do not have permission to process this document.') {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Process document error:', err);
    res.status(500).json({ error: 'Failed to process document.' });
  }
});

/**
 * POST /:id/submit-payment
 * Allows a student to submit their GCash payment reference and upload a receipt.
 */
router.post('/:id/submit-payment', authenticate, upload.single('receipt'), async (req, res) => {
  try {
    const docId = req.params.id;
    const { gcash_reference_no } = req.body;

    if (!gcash_reference_no) {
      return res.status(400).json({ error: 'GCash Reference Number is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image file upload is required.' });
    }

    const receiptPath = `/uploads/${req.file.filename}`;

    const [result] = await pool.query(
      `UPDATE documents 
       SET current_status = "pending_payment_verification", 
           gcash_reference_no = ?, 
           receipt_image_path = ? 
       WHERE id = ?`,
      [gcash_reference_no, receiptPath, docId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Document request not found.' });
    }

    // Log step log
    await pool.query(
      `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
       VALUES (?, ?, 'payment_submitted', 'pending_payment', 'pending_payment_verification', ?)` ,
      [docId, req.user.id, `Payment reference ${gcash_reference_no} submitted by student.`]
    );

    // --- IN-APP NOTIFICATION FOR FINANCE CLERKS ---
    try {
      const [financeClerks] = await pool.query('SELECT id FROM users WHERE role = "clerk" AND desk_assignment = "Finance"');
      for (const clerk of financeClerks) {
        await pool.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [clerk.id, 'New Payment Submission', `Student submitted payment (Ref: ${gcash_reference_no}) for verification.`, 'info']
        );
      }
    } catch (notifErr) {
      console.error('Failed to create in-app notification for Finance:', notifErr);
    }

    res.json({ message: 'Payment receipt submitted successfully. Waiting for clerk verification.' });
  } catch (err) {
    console.error('Submit payment error:', err);
    res.status(500).json({ error: 'Failed to submit payment.' });
  }
});

/**
 * POST /:id/verify-payment
 * Allows the Finance Clerk to verify (approve or reject) a student's GCash receipt.
 */
router.post('/:id/verify-payment', authenticate, upload.single('officialReceipt'), async (req, res) => {
  try {
    if (req.user.role !== 'clerk' || req.user.desk_assignment !== 'Finance') {
      return res.status(403).json({ error: 'Only Finance Clerks can verify payments.' });
    }

    const docId = req.params.id;
    const { action, notes } = req.body; // 'approve' or 'reject'
    const officialReceiptPath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [docs] = await connection.query('SELECT * FROM documents WHERE id = ? FOR UPDATE', [docId]);
      if (docs.length === 0) {
        throw new Error('Document not found.');
      }

      const doc = docs[0];
      const newStatus = action === 'approve' ? 'pending_secretary' : 'pending_payment';
      const paymentStatus = action === 'approve' ? 'PAID' : 'UNPAID';

      if (officialReceiptPath) {
        await connection.query(
          `UPDATE documents SET current_status = ?, payment_status = ?, official_receipt_path = ? WHERE id = ?`,
          [newStatus, paymentStatus, officialReceiptPath, docId]
        );
      } else {
        await connection.query(
          `UPDATE documents SET current_status = ?, payment_status = ? WHERE id = ?`,
          [newStatus, paymentStatus, docId]
        );
      }

      // Log step
      await connection.query(
        `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
         VALUES (?, ?, ?, 'pending_payment_verification', ?, ?)`,
         [docId, req.user.id, action === 'approve' ? 'payment_approved' : 'payment_rejected', newStatus, notes || `Payment ${action}d by Finance Clerk.`]
      );

      await connection.commit();

      // --- IN-APP NOTIFICATION ---
      try {
        if (doc.student_id) {
          const [users] = await connection.query('SELECT id FROM users WHERE student_id = ? AND role = "student"', [doc.student_id]);
          if (users.length > 0) {
            const title = action === 'approve' ? 'Payment Verified' : 'Payment Rejected';
            const msg = action === 'approve' 
              ? `Your payment for ${doc.document_type} has been verified! Your document is now being processed.`
              : `Your payment for ${doc.document_type} was rejected. Reason: ${notes || 'Invalid receipt or reference number.'}`;
            const type = action === 'approve' ? 'success' : 'error';
            
            // We use pool.query here because connection is already committed and might be released soon, 
            // but actually we can still use connection since we haven't released it yet.
            await connection.query(
              'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
              [users[0].id, title, msg, type]
            );
          }
        }
        
        // --- IN-APP NOTIFICATION FOR SECRETARY ---
        if (action === 'approve') {
          try {
            const [secretaryClerks] = await connection.query('SELECT id FROM users WHERE role = "clerk" AND desk_assignment = "Secretary"');
            for (const clerk of secretaryClerks) {
              await connection.query(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [clerk.id, 'New Document Evaluation', `Payment verified for ${doc.document_type}. Ready for your evaluation.`, 'info']
              );
            }
          } catch (notifErr) {
            console.error('Failed to create in-app notification for Secretary:', notifErr);
          }
        }
      } catch (notifErr) {
        console.error('Failed to create in-app notification:', notifErr);
      }

      res.json({ message: `Payment successfully ${action === 'approve' ? 'verified' : 'rejected'}.` });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Failed to process payment verification.' });
  }
});

/**
 * POST /:id/evaluate
 * Allows the College Secretary to review OCR data, make adjustments, and route to Window 1.
 */
router.post('/:id/evaluate', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'clerk' || req.user.desk_assignment !== 'Secretary') {
      return res.status(403).json({ error: 'Only College Secretaries can evaluate documents.' });
    }

    const docId = req.params.id;
    const { student_id, student_name, document_type, action, notes } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [docs] = await connection.query('SELECT * FROM documents WHERE id = ? FOR UPDATE', [docId]);
      if (docs.length === 0) {
        throw new Error('Document not found.');
      }

      const doc = docs[0];
      const newStatus = action === 'approve' ? 'ready_window_1' : 'rejected';

      await connection.query(
        `UPDATE documents SET 
          current_status = ?, 
          student_id = COALESCE(?, student_id),
          student_name = COALESCE(?, student_name),
          document_type = COALESCE(?, document_type)
         WHERE id = ?`,
        [newStatus, student_id, student_name, document_type, docId]
      );

      // Log step
      await connection.query(
        `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
         VALUES (?, ?, ?, 'pending_secretary', ?, ?)`,
         [docId, req.user.id, action === 'approve' ? 'secretary_approved' : 'secretary_rejected', newStatus, notes || `Document evaluated and ${action}d by College Secretary.`]
      );

      await connection.commit();

      // --- SMS NOTIFICATION (UniSMS) ---
      if (action === 'approve') {
        try {
          const senderId = process.env.UNISMS_SENDER_ID || 'TRACE';
          const msgContent = `Hi ${student_name ? student_name.split(',')[0] : 'Student'}, your ${document_type || 'Document'} is ready for pick-up at Window 1. Reference: ${doc.tracking_number}`;
          
          await unismsClient.send({
            recipient: process.env.TEST_PHONE_NUMBER || '+639123456789', // Usually fetch from user record
            content: msgContent,
            senderId: senderId
          });
          console.log(`✅ [UniSMS] SMS notification dispatched for ${doc.tracking_number}`);
        } catch (smsErr) {
          console.error('❌ [UniSMS] Failed to send SMS:', smsErr.message);
        }
      }

      // --- IN-APP NOTIFICATION ---
      try {
        const studentIdToNotify = student_id || doc.student_id;
        if (studentIdToNotify) {
          const [users] = await connection.query('SELECT id FROM users WHERE student_id = ? AND role = "student"', [studentIdToNotify]);
          if (users.length > 0) {
            const title = action === 'approve' ? 'Document Ready' : 'Document Rejected';
            const msg = action === 'approve' 
              ? `Your ${document_type || 'document'} is ready for pick-up at Window 1. Reference: ${doc.tracking_number}`
              : `Your ${document_type || 'document'} has been rejected. Reason: ${notes}`;
            const type = action === 'approve' ? 'success' : 'error';
            
            await connection.query(
              'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
              [users[0].id, title, msg, type]
            );
          }
        }
      } catch (notifErr) {
        console.error('Failed to create in-app notification:', notifErr);
      }

      // --- IN-APP NOTIFICATION FOR WINDOW 1 CLERKS ---
      if (action === 'approve') {
        try {
          const [window1Clerks] = await connection.query('SELECT id FROM users WHERE role = "clerk" AND desk_assignment = "Window 1"');
          for (const clerk of window1Clerks) {
            await connection.query(
              'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
              [clerk.id, 'New Document Ready', `${document_type || 'Document'} is ready for release to ${student_name}.`, 'info']
            );
          }
        } catch (notifErr) {
          console.error('Failed to create in-app notification for Window 1:', notifErr);
        }
      }

      res.json({ message: `Document successfully evaluated and ${action === 'approve' ? 'approved' : 'rejected'}.` });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Evaluate document error:', err);
    res.status(500).json({ error: 'Failed to evaluate document.' });
  }
});

/**
 * POST /:id/release
 * Allows the Window 1 Clerk to release the document to the student.
 */
router.post('/:id/release', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'clerk' || req.user.desk_assignment !== 'Window 1') {
      return res.status(403).json({ error: 'Only Window 1 Clerks can release documents.' });
    }

    const docId = req.params.id;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [docs] = await connection.query('SELECT * FROM documents WHERE id = ? FOR UPDATE', [docId]);
      if (docs.length === 0) {
        throw new Error('Document not found.');
      }

      const doc = docs[0];

      await connection.query(
        `UPDATE documents SET current_status = "completed" WHERE id = ?`,
        [docId]
      );

      // Log step
      await connection.query(
        `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
         VALUES (?, ?, 'released', 'ready_window_1', 'completed', 'Document released to student.')`,
         [docId, req.user.id]
      );

      await connection.commit();
      res.json({ message: 'Document successfully released to student.' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Release document error:', err);
    res.status(500).json({ error: 'Failed to release document.' });
  }
});

/**
 * DELETE /:id
 * Allows a student to cancel an unpaid request.
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can cancel requests.' });
    }

    const docId = req.params.id;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [docs] = await connection.query('SELECT * FROM documents WHERE id = ? FOR UPDATE', [docId]);
      if (docs.length === 0) {
        throw new Error('Document not found.');
      }

      const doc = docs[0];
      
      const [u] = await connection.query('SELECT student_id FROM users WHERE id = ?', [req.user.id]);
      if (!u[0] || doc.student_id !== u[0].student_id) {
        throw new Error('Unauthorized. You can only cancel your own requests.');
      }

      if (doc.current_status !== 'pending_payment') {
        throw new Error('Cannot cancel a request that is already being processed.');
      }

      await connection.query('DELETE FROM step_logs WHERE document_id = ?', [docId]);
      await connection.query('DELETE FROM documents WHERE id = ?', [docId]);

      await connection.commit();
      res.json({ message: 'Request successfully cancelled.' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Cancel document error:', err);
    res.status(err.message.includes('Cannot cancel') || err.message.includes('Unauthorized') ? 400 : 500).json({ error: err.message || 'Failed to cancel document.' });
  }
});

module.exports = router;
