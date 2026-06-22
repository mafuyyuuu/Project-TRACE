const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');

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

module.exports = router;
