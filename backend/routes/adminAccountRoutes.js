const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/', async (req, res) => {
  try {
    const admins = await Admin.find().select('username email name createdAt').sort({ createdAt: 1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin accounts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, email, name, password } = req.body;
    if (!username || !email || !password || password.length < 8) {
      return res.status(400).json({ message: 'Username, email, and a password of at least 8 characters are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    if (await Admin.findOne({ $or: [{ username: cleanUsername }, { email: cleanEmail }] })) {
      return res.status(409).json({ message: 'An admin already uses that username or email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      username: cleanUsername,
      email: cleanEmail,
      name: name?.trim() || cleanUsername,
      passwordHash
    });

    res.status(201).json({ _id: admin._id, username: admin.username, email: admin.email, name: admin.name });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create admin account' });
  }
});

module.exports = router;