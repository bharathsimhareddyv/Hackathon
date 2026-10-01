const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Participant = require('../models/Participant');
const Admin = require('../models/Admin');
const TeamAccount = require('../models/TeamAccount');
const Terms = require('../models/Terms');
const TermsAcceptance = require('../models/TermsAcceptance');
const RoundTeam = require('../models/RoundTeam');
const OtpToken = require('../models/OtpToken');
const { isEmailConfigured, sendMail } = require('../utils/emailService');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'aarohan_hackathon_super_secret_jwt_token_key_2026_tribal_students';

// Helper to sign JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// @route POST /api/auth/student-login
router.post('/student-login', async (req, res) => {
  try {
    const { arohanId, password } = req.body;
    if (!arohanId || !password) {
      return res.status(400).json({ message: 'Arohan ID and password are required' });
    }

    const cleanId = arohanId.trim().toUpperCase();
    const participant = await Participant.findOne({ arohanId: cleanId });

    if (!participant) {
      return res.status(401).json({ message: 'Invalid Arohan ID or Password' });
    }

    if (!participant.active) {
      return res.status(403).json({ message: 'Account disabled by Admin. Please contact organizers.' });
    }

    const isMatch = await bcrypt.compare(password, participant.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Arohan ID or Password' });
    }

    // Check terms status
    const currentTerms = await Terms.findOne({ isCurrent: true });
    let termsAccepted = participant.termsAccepted;

    if (currentTerms) {
      const acceptance = await TermsAcceptance.findOne({
        participantId: participant.arohanId,
        termsVersion: currentTerms.version
      });
      termsAccepted = !!acceptance;
    }

    const token = generateToken(participant._id, 'STUDENT');

    res.json({
      token,
      user: {
        id: participant._id,
        arohanId: participant.arohanId,
        role: 'STUDENT',
        termsAccepted,
        termsVersionAccepted: participant.termsVersionAccepted,
        forcePasswordChange: participant.forcePasswordChange,
        currentRound: participant.currentRound,
        status: participant.status
      }
    });
  } catch (error) {
    console.error('Student Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.post('/team-login', async (req, res) => {
  try {
    const { loginId, password, termsAccepted } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ message: 'Team login ID and password are required' });
    }

    const team = await TeamAccount.findOne({ loginId: loginId.trim().toLowerCase() });
    if (!team || team.status !== 'ACTIVE' || !(await bcrypt.compare(password, team.passwordHash))) {
      return res.status(401).json({ message: 'Invalid team login ID or password' });
    }

    const currentTerms = await Terms.findOne({ isCurrent: true });
    if (currentTerms && termsAccepted !== true) {
      return res.status(400).json({ message: 'Accept the current Terms & Conditions before signing in' });
    }

    if (currentTerms) {
      const assignments = await RoundTeam.find({ teamAccountId: team._id }).select('participantIds');
      const participantIds = [...new Set(assignments.flatMap(assignment => assignment.participantIds || []))];
      const acceptedAt = new Date();
      await Promise.all(participantIds.map(participantId => TermsAcceptance.updateOne(
        { participantId, termsVersion: currentTerms.version },
        { $setOnInsert: {
          participantId,
          termsVersion: currentTerms.version,
          acceptedAt,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || ''
        } },
        { upsert: true }
      )));
      await Participant.updateMany(
        { arohanId: { $in: participantIds } },
        { $set: { termsAccepted: true, termsVersionAccepted: currentTerms.version } }
      );
      await Participant.updateMany(
        { arohanId: { $in: participantIds }, status: { $in: ['REGISTERED', 'TERMS_PENDING'] } },
        { $set: { status: 'READY' } }
      );
      team.termsAccepted = true;
      team.termsVersionAccepted = currentTerms.version;
      await team.save();
    }

    res.json({
      token: generateToken(team._id, 'TEAM'),
      user: { id: team._id, loginId: team.loginId, role: 'TEAM', currentRound: team.currentRound, status: team.status, termsAccepted: team.termsAccepted, termsVersionAccepted: team.termsVersionAccepted }
    });
  } catch (error) {
    console.error('Team Login Error:', error);
    res.status(500).json({ message: 'Server error during team login' });
  }
});

// @route POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username/Email and Password are required' });
    }

    const admin = await Admin.findOne({
      $or: [{ username: username.trim() }, { email: username.trim().toLowerCase() }]
    });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid Admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Admin credentials' });
    }

    const token = generateToken(admin._id, 'ADMIN');

    res.json({
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
        role: 'ADMIN'
      }
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
});

// @route GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  if (req.user.role === 'STUDENT') {
    const currentTerms = await Terms.findOne({ isCurrent: true });
    let termsAccepted = req.user.termsAccepted;
    if (currentTerms) {
      const acceptance = await TermsAcceptance.findOne({
        participantId: req.user.arohanId,
        termsVersion: currentTerms.version
      });
      termsAccepted = !!acceptance;
    }

    return res.json({
      user: {
        id: req.user._id,
        arohanId: req.user.arohanId,
        role: 'STUDENT',
        termsAccepted,
        currentRound: req.user.currentRound,
        status: req.user.status,
        forcePasswordChange: req.user.forcePasswordChange
      }
    });
  }

  if (req.user.role === 'TEAM') {
    return res.json({
      user: {
        id: req.user._id,
        loginId: req.user.loginId,
        role: 'TEAM',
        currentRound: req.user.currentRound,
        status: req.user.status
      }
    });
  }

  return res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      name: req.user.name,
      role: 'ADMIN'
    }
  });
});

// @route POST /api/auth/change-password
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    if (req.user.role === 'STUDENT') {
      const participant = await Participant.findById(req.user._id);
      const isMatch = await bcrypt.compare(currentPassword, participant.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      participant.passwordHash = await bcrypt.hash(newPassword, salt);
      participant.forcePasswordChange = false;
      participant.temporaryPasswordPlain = null;
      await participant.save();

      return res.json({ message: 'Password updated successfully' });
    } else if (req.user.role === 'TEAM') {
      const team = await TeamAccount.findById(req.user._id);
      if (!team || !(await bcrypt.compare(currentPassword, team.passwordHash))) {
        return res.status(400).json({ message: 'Current password incorrect' });
      }
      team.passwordHash = await bcrypt.hash(newPassword, 10);
      team.temporaryPasswordPlain = null;
      await team.save();
      return res.json({ message: 'Team password updated successfully' });
    } else {
      const admin = await Admin.findById(req.user._id);
      const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      admin.passwordHash = await bcrypt.hash(newPassword, salt);
      await admin.save();

      return res.json({ message: 'Admin password updated successfully' });
    }
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ message: 'Failed to update password' });
  }
});

router.post('/admin-password-change/request-code', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });
    const admin = await Admin.findById(req.user._id);
    if (!admin?.email) return res.status(400).json({ message: 'Your admin account needs an email address before changing its password' });
    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Configure SMTP_SERVICE, SMTP_USER, and SMTP_PASS before requesting a verification code.' });
    }
    const targetEmail = admin.email.trim().toLowerCase();
    const code = crypto.randomInt(100000, 1000000).toString();
    await OtpToken.deleteMany({ email: targetEmail, purpose: 'ADMIN_PASSWORD_CHANGE' });
    await OtpToken.create({
      email: targetEmail,
      codeHash: await bcrypt.hash(code, 10),
      purpose: 'ADMIN_PASSWORD_CHANGE',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    await sendMail({
      to: targetEmail,
      subject: 'AAROHAN admin password verification code',
      text: `Your AAROHAN admin password verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your AAROHAN admin password verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
    });
    res.json({ message: `Verification code sent to ${targetEmail}`, email: targetEmail });
  } catch (error) {
    console.error('Admin Password OTP Error:', error.code || 'unknown', error.statusCode || '');
    const status = error.code === 'SMTP_NOT_CONFIGURED' ? 503 : error.code?.startsWith('SMTP_') ? 502 : 500;
    res.status(status).json({ message: 'Could not send the verification code through SMTP. Check the SMTP service and credentials.' });
  }
});

router.post('/admin-password-change/verify-code', protect, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });
    const { code, newPassword } = req.body;
    if (!/^\d{6}$/.test(code || '') || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Enter the 6-digit code and a password of at least 8 characters' });
    }

    const admin = await Admin.findById(req.user._id);
    if (!admin?.email) return res.status(400).json({ message: 'Your admin account needs an email address before changing its password' });
    const targetEmail = admin.email.trim().toLowerCase();
    const otp = await OtpToken.findOne({ email: targetEmail, purpose: 'ADMIN_PASSWORD_CHANGE' }).sort({ createdAt: -1 });
    if (!otp || otp.expiresAt < new Date() || !(await bcrypt.compare(code, otp.codeHash))) {
      return res.status(400).json({ message: 'Verification code is invalid or expired' });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();
    await OtpToken.deleteMany({ email: targetEmail, purpose: 'ADMIN_PASSWORD_CHANGE' });
    res.json({ message: 'Admin password changed successfully' });
  } catch (error) {
    console.error('Admin Password Change Error:', error);
    res.status(500).json({ message: 'Could not change admin password' });
  }
});

module.exports = router;
