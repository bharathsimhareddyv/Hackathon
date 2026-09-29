const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly);

// @route GET /api/admin/activity-logs
router.get('/', async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (error) {
    console.error('Fetch Activity Logs Error:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

module.exports = router;
