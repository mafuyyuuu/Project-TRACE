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
        student_id: user.student_id,
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
      'SELECT id, student_id, email, full_name, role, desk_assignment, is_active, phone_number, course, created_at FROM users WHERE id = ?',
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
    const [existing] = await pool.query('SELECT id, verification_status FROM users WHERE student_id = ?', [employee_id]);
    if (existing.length > 0) {
      if (existing[0].verification_status === 'rejected') {
        // Allow re-registration by deleting the old rejected record
        await pool.query('DELETE FROM users WHERE id = ?', [existing[0].id]);
      } else {
        return res.status(400).json({ error: 'Student ID is already registered.' });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id_proof_path = req.file.path;
    
    // Call AI Engine for auto-verification
    let verification_status = 'pending';
    let verification_reason = 'Pending manual review.';
    try {
      const aiEngineUrl = 'http://127.0.0.1:5005';
      const fs = require('fs');
      
      const fileBuffer = fs.readFileSync(id_proof_path);
      const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
      
      const form = new FormData();
      form.append('document', fileBlob, req.file.originalname);
      form.append('student_id', employee_id);

      const aiRes = await fetch(`${aiEngineUrl}/ocr/verify`, {
        method: 'POST',
        body: form
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

/**
 * GET /pending-students
 * Retrieve a list of all student users that are pending admin verification.
 * Only accessible to admins.
 */
router.get('/pending-students', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const [rows] = await pool.query(
      'SELECT id, student_id, email, full_name, role, user_type, id_proof_path, verification_status, created_at FROM users WHERE role = "student" AND verification_status = "pending"'
    );

    res.json({ pending_students: rows });
  } catch (err) {
    console.error('Fetch pending students error:', err);
    res.status(500).json({ error: 'Failed to retrieve pending student accounts.' });
  }
});

/**
 * POST /verify-student/:id
 * Manually verify or reject a pending student user account.
 * Only accessible to admins.
 */
router.post('/verify-student/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const userId = req.params.id;
    const { action } = req.body; // 'verify' or 'reject'

    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be verify or reject.' });
    }

    const newStatus = action === 'verify' ? 'verified' : 'rejected';

    const [result] = await pool.query(
      'UPDATE users SET verification_status = ? WHERE id = ? AND role = "student"',
      [newStatus, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pending student user not found.' });
    }

    res.json({ message: `Student account successfully ${newStatus}.` });
  } catch (err) {
    console.error('Verify student account error:', err);
    res.status(500).json({ error: 'Failed to update student account verification.' });
  }
});

/**
 * GET /users
 * Retrieve all registered users for Admin Registered Users tab.
 */
router.get('/users', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    const [rows] = await pool.query(
      'SELECT id, student_id, full_name, email, course, role, verification_status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('Fetch all users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

/**
 * GET /student/:studentId
 * Lookup student details.
 */
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const [rows] = await pool.query(
      'SELECT student_id, full_name, email, course, user_type FROM users WHERE student_id = ? AND role = "student"',
      [studentId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json({ student: rows[0] });
  } catch (err) {
    console.error('Student lookup error:', err);
    res.status(500).json({ error: 'Failed to look up student.' });
  }
});

/**
 * PUT /profile
 * Update user profile (phone number, course, password)
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { phone_number, course, password } = req.body;
    
    let queryParams = [];
    let setClause = [];

    if (phone_number !== undefined) {
      setClause.push('phone_number = ?');
      queryParams.push(phone_number);
    }
    if (course !== undefined) {
      setClause.push('course = ?');
      queryParams.push(course);
    }
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      setClause.push('password_hash = ?');
      queryParams.push(password_hash);
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    queryParams.push(req.user.id);
    await pool.query(`UPDATE users SET ${setClause.join(', ')} WHERE id = ?`, queryParams);

    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

/**
 * GET /notifications
 * Fetch user's notifications
 */
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

/**
 * PUT /notifications/read
 * Mark notifications as read
 */
router.put('/notifications/read', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ message: 'Notifications marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

module.exports = router;
