const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, 'proof-' + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'trace-jwt-secret-change-in-production';

/**
 * POST /login
 * Authenticate a user with employee_id (mapped to student_id) and password.
 * Returns a JWT token and user info on success.
 */
router.post('/login', async (req, res) => {
  try {
    const { employee_id, password } = req.body;

    if (!employee_id || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required.' });
    }

    // Look up user by student_id
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE student_id = ? AND is_active = TRUE',
      [employee_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = rows[0];

    // Compare password with stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.role === 'student' && user.verification_status !== 'verified') {
      return res.status(403).json({ error: 'Your account is pending verification. Please wait for an admin to approve your request.' });
    }

    // Generate JWT token (24 hour expiry)
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        full_name: user.full_name,
        desk_assignment: user.desk_assignment,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        desk_assignment: user.desk_assignment,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /me
 * Returns the currently authenticated user's info from a fresh DB lookup.
 * Requires a valid JWT token.
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, student_id, email, full_name, role, desk_assignment, is_active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /register
 * Register a new student/alumni account with proof of ID.
 */
router.post('/register', upload.single('id_proof'), async (req, res) => {
  try {
    const { employee_id, full_name, email, password, user_type } = req.body;
    if (!employee_id || !full_name || !password) {
      return res.status(400).json({ error: 'Student ID, Name, and Password are required.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Proof of ID/Diploma is required for verification.' });
    }

    // Check if user exists
    const [existing] = await pool.query('SELECT id FROM users WHERE student_id = ?', [employee_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Student ID is already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id_proof_path = req.file.path;
    
    // Call AI Engine for auto-verification
    let verification_status = 'pending';
    let verification_reason = 'Pending manual review.';
    try {
      const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:5000';
      const fs = require('fs');
      const FormData = require('form-data');
      const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

      const form = new FormData();
      form.append('document', fs.createReadStream(id_proof_path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      form.append('student_id', employee_id);

      const aiRes = await fetchFn(`${aiEngineUrl}/ocr/verify`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders ? form.getHeaders() : {},
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        if (aiData.verified) {
          verification_status = 'verified';
          verification_reason = aiData.reason;
          console.log(`✅ AI Auto-Verified user ${employee_id}: ${verification_reason}`);
        } else {
          console.log(`⚠️ AI could not auto-verify user ${employee_id}: ${aiData.reason}`);
        }
      }
    } catch (aiErr) {
      console.warn(`⚠️ AI verification unavailable:`, aiErr.message);
    }

    await pool.query(
      `INSERT INTO users (student_id, full_name, email, password_hash, role, user_type, id_proof_path, verification_status)
       VALUES (?, ?, ?, ?, 'student', ?, ?, ?)`,
      [employee_id, full_name, email || null, password_hash, user_type || 'student', id_proof_path, verification_status]
    );

    if (verification_status === 'verified') {
      res.status(201).json({ message: 'Registration successful. Your account was automatically verified by AI!' });
    } else {
      res.status(201).json({ message: 'Registration successful. AI could not automatically verify your ID. Please wait for administrator verification.' });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
