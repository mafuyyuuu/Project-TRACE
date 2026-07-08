const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

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
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded.' });
    }

    // Generate unique tracking number
    const trackingNumber = 'TRC-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const { student_id, student_name, document_type } = req.body;

    await connection.beginTransaction();

    // Insert document record
    const [docResult] = await connection.query(
      `INSERT INTO documents (tracking_number, student_id, student_name, document_type,
        current_status, payment_status, assigned_clerk_id, file_path, original_filename, checkout_url)
       VALUES (?, ?, ?, ?, 'pending_payment', 'UNPAID', ?, ?, ?, ?)`,
      [
        trackingNumber,
        student_id || null,
        student_name || null,
        document_type || null,
        req.user.id,
        req.file.path,
        req.file.originalname,
        `https://pm.link/mock/${trackingNumber}`
      ]
    );

    const documentId = docResult.insertId;

    // Create initial step_log entry
    await connection.query(
      `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
       VALUES (?, ?, 'submitted', NULL, 'pending_payment', ?)`,
      [documentId, req.user.id, `Document uploaded by ${req.user.full_name}, waiting for payment.`]
    );

    await connection.commit();

    // Fetch the inserted document
    const [docRows] = await pool.query(
      'SELECT * FROM documents WHERE id = ?',
      [documentId]
    );

    // Await Python OCR engine and process results
    const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:5000';
    try {
      const fs = require('fs');
      const FormData = require('form-data');

      const form = new FormData();
      form.append('file', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
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
        
        // Update document with OCR data
        if (ocrData.success && ocrData.extracted_data) {
          await pool.query(
            `UPDATE documents SET 
              ocr_raw_text = ?, 
              ocr_extracted_data = ?, 
              student_id = COALESCE(?, student_id), 
              document_type = COALESCE(?, document_type) 
             WHERE id = ?`,
            [
              ocrData.raw_text,
              JSON.stringify(ocrData.extracted_data),
              ocrData.extracted_data.student_id,
              ocrData.extracted_data.form_type,
              documentId
            ]
          );

          // Fetch the updated document
          const [updatedRows] = await pool.query('SELECT * FROM documents WHERE id = ?', [documentId]);
          docRows[0] = updatedRows[0];
        }
      }
    } catch (ocrErr) {
      console.warn(`⚠️ OCR engine unavailable or failed for ${trackingNumber}:`, ocrErr.message);
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
    const { status, page = 1, limit = 5 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
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
          conditions.push('current_status = "pending_secretary"');
        } else if (desk === 'Window 1') {
          conditions.push('current_status IN ("ready_window_1", "completed", "released")');
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

    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await pool.query(query, params);

    res.json({
      documents: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Failed to retrieve documents.' });
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
      'SELECT id, tracking_number, student_id, student_name, document_type, current_status, original_filename, created_at, updated_at FROM documents WHERE tracking_number = ?',
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
router.post('/:id/verify-payment', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'clerk' || req.user.desk_assignment !== 'Finance') {
      return res.status(403).json({ error: 'Only Finance Clerks can verify payments.' });
    }

    const docId = req.params.id;
    const { action, notes } = req.body; // 'approve' or 'reject'

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

      await connection.query(
        `UPDATE documents SET current_status = ?, payment_status = ? WHERE id = ?`,
        [newStatus, paymentStatus, docId]
      );

      // Log step
      await connection.query(
        `INSERT INTO step_logs (document_id, clerk_id, action_taken, from_status, to_status, notes)
         VALUES (?, ?, ?, 'pending_payment_verification', ?, ?)`,
         [docId, req.user.id, action === 'approve' ? 'payment_approved' : 'payment_rejected', newStatus, notes || `Payment ${action}d by Finance Clerk.`]
      );

      await connection.commit();
      res.json({ message: `Payment successfully ${action}d.` });
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

module.exports = router;
