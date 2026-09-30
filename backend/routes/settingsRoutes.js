const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const { isCloudinaryConfigured, uploadToCloudinary } = require('../config/cloudinary');

const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file.originalname).toLowerCase())) {
      return callback(new Error('Logo must be a PNG, JPG, or WebP image'));
    }
    callback(null, true);
  }
});

// @route GET /api/settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    console.error('Fetch Settings Error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// @route PUT /api/admin/settings
router.put('/', protect, adminOnly, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings({});

    const fields = ['hackathonName', 'programName', 'logoUrl', 'description', 'contactInfo', 'welcomeEmailSubject', 'welcomeEmailBody', 'leaderboardPublic', 'forceTermsAcceptance'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) settings[f] = req.body[f];
    });

    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

router.post('/logo', protect, adminOnly, uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a logo image to upload' });
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ message: 'Configure Cloudinary before uploading the program logo' });
    }
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'aarohan_branding');
    const settings = await Settings.findOneAndUpdate({}, { logoUrl: result.secure_url }, { new: true, upsert: true });
    res.json({ logoUrl: settings.logoUrl });
  } catch (error) {
    console.error('Upload Logo Error:', error);
    res.status(500).json({ message: 'Failed to upload program logo' });
  }
});

module.exports = router;
