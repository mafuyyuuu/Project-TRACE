const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

/**
 * GET /api/settings
 * Public route to retrieve all global system settings.
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to retrieve system settings.' });
  }
});

/**
 * PUT /api/settings
 * Protected route (Admin only) to update system settings.
 */
router.put('/', authenticate, requireRole('admin'), async (req, res) => {
  const { system_name, system_logo_initials, organization_name, system_logo_pic } = req.body;

  try {
    const queries = [];
    
    if (system_name !== undefined) {
      queries.push(pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['system_name', system_name, system_name]
      ));
    }
    if (system_logo_initials !== undefined) {
      queries.push(pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['system_logo_initials', system_logo_initials, system_logo_initials]
      ));
    }
    if (organization_name !== undefined) {
      queries.push(pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['organization_name', organization_name, organization_name]
      ));
    }
    if (system_logo_pic !== undefined) {
      queries.push(pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['system_logo_pic', system_logo_pic, system_logo_pic]
      ));
    }

    await Promise.all(queries);

    res.json({ message: 'System settings updated successfully.' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Failed to update system settings.' });
  }
});

module.exports = router;
