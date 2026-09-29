const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Participant = require('../models/Participant');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { generateRandomPassword } = require('../utils/passwordGenerator');

// All routes here are admin protected
router.use(protect, adminOnly);

// @route GET /api/admin/participants
router.get('/', async (req, res) => {
  try {
    const { search, status, round, active } = req.query;
    let filter = {};

    if (search) {
      filter.$or = [
        { arohanId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (round) filter.currentRound = Number(round);
    if (active !== undefined && active !== '') filter.active = active === 'true';

    const participants = await Participant.find(filter).sort({ arohanId: 1 });
    res.json(participants);
  } catch (error) {
    console.error('Fetch Participants Error:', error);
    res.status(500).json({ message: 'Failed to fetch participants' });
  }
});

// @route POST /api/admin/participants/generate
// Generates Arohan IDs from startId to endId (e.g. AIF260001 to AIF260054)
router.post('/generate', async (req, res) => {
  try {
    const { startId, endId, generatePasswordsImmediately = true } = req.body;

    if (!startId || !endId) {
      return res.status(400).json({ message: 'Start ID and End ID are required (e.g. AIF260001 and AIF260054)' });
    }

    // Extract prefix and numerical parts
    const matchStart = startId.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    const matchEnd = endId.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);

    if (!matchStart || !matchEnd || matchStart[1] !== matchEnd[1]) {
      return res.status(400).json({ message: 'Invalid ID format or mismatched prefixes. Example: AIF260001 to AIF260054' });
    }

    const prefix = matchStart[1];
    const startNum = parseInt(matchStart[2], 10);
    const endNum = parseInt(matchEnd[2], 10);
    const padLen = matchStart[2].length;

    if (startNum > endNum) {
      return res.status(400).json({ message: 'Start number cannot be greater than end number' });
    }

    const created = [];
    const skipped = [];

    const salt = await bcrypt.genSalt(10);

    for (let i = startNum; i <= endNum; i++) {
      const formattedNum = String(i).padStart(padLen, '0');
      const arohanId = `${prefix}${formattedNum}`;

      const existing = await Participant.findOne({ arohanId });
      if (existing) {
        skipped.push(arohanId);
        continue;
      }

      let tempPassword = generateRandomPassword();
      let hashed = await bcrypt.hash(tempPassword, salt);

      const p = new Participant({
        arohanId,
        passwordHash: hashed,
        temporaryPasswordPlain: tempPassword,
        status: 'REGISTERED'
      });

      await p.save();
      created.push({ arohanId, tempPassword });
    }

    // Activity log
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'BULK_PARTICIPANT_GENERATION',
      details: `Generated ${created.length} participants from ${startId} to ${endId}. Skipped ${skipped.length} existing.`
    });

    res.json({
      message: `Successfully generated ${created.length} participants!`,
      createdCount: created.length,
      skippedCount: skipped.length,
      created
    });
  } catch (error) {
    console.error('Generate Participants Error:', error);
    res.status(500).json({ message: 'Failed to generate participants' });
  }
});

// @route POST /api/admin/participants/generate-passwords
// Bulk generates new temporary passwords for participants
router.post('/generate-passwords', async (req, res) => {
  try {
    const { overwriteExisting = false, participantIds } = req.body;
    let query = {};

    if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
      query.arohanId = { $in: participantIds };
    }

    const participants = await Participant.find(query);
    const salt = await bcrypt.genSalt(10);
    let updatedCount = 0;

    for (const p of participants) {
      if (!p.temporaryPasswordPlain || overwriteExisting) {
        const tempPass = generateRandomPassword();
        p.passwordHash = await bcrypt.hash(tempPass, salt);
        p.temporaryPasswordPlain = tempPass;
        await p.save();
        updatedCount++;
      }
    }

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'BULK_PASSWORD_GENERATION',
      details: `Generated/reset temporary passwords for ${updatedCount} participants.`
    });

    res.json({ message: `Successfully generated passwords for ${updatedCount} participants.` });
  } catch (error) {
    console.error('Bulk Passwords Error:', error);
    res.status(500).json({ message: 'Failed to bulk generate passwords' });
  }
});

// @route POST /api/admin/participants/:id/reset-password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const newTempPassword = generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    participant.passwordHash = await bcrypt.hash(newTempPassword, salt);
    participant.temporaryPasswordPlain = newTempPassword;
    participant.forcePasswordChange = true;
    await participant.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'PASSWORD_RESET',
      participantId: participant.arohanId,
      details: `Reset password for ${participant.arohanId}`
    });

    res.json({
      message: `Password reset for ${participant.arohanId}`,
      arohanId: participant.arohanId,
      temporaryPassword: newTempPassword
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// @route PUT /api/admin/participants/:id
router.put('/:id', async (req, res) => {
  try {
    const { active, name, college, email, status, currentRound } = req.body;
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    const oldStatus = participant.status;

    if (active !== undefined) participant.active = active;
    if (name !== undefined) participant.name = name;
    if (college !== undefined) participant.college = college;
    if (email !== undefined) participant.email = email;
    if (status) participant.status = status;
    if (currentRound) participant.currentRound = currentRound;

    await participant.save();

    if (status && oldStatus !== status) {
      await ActivityLog.create({
        actor: req.user.username || 'Admin',
        action: 'PARTICIPANT_STATUS_CHANGE',
        participantId: participant.arohanId,
        oldValue: oldStatus,
        newValue: status,
        details: `Status changed from ${oldStatus} to ${status}`
      });
    }

    res.json(participant);
  } catch (error) {
    console.error('Update Participant Error:', error);
    res.status(500).json({ message: 'Failed to update participant' });
  }
});

module.exports = router;
