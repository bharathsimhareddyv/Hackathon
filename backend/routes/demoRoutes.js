const express = require('express');
const router = express.Router();
const { seedDemoData } = require('../utils/sampleDataSeeder');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly);

// @route POST /api/admin/demo/seed
router.post('/seed', async (req, res) => {
  try {
    const result = await seedDemoData();
    res.json({
      message: 'Demo mode data seeded successfully!',
      details: result
    });
  } catch (error) {
    console.error('Demo Seed Error:', error);
    res.status(500).json({ message: 'Failed to seed demo data' });
  }
});

module.exports = router;
