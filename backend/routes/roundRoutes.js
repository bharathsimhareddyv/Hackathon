const express = require('express');
const router = express.Router();
const Round = require('../models/Round');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @route GET /api/rounds
// Get all rounds (accessible to authenticated users or public)
router.get('/', async (req, res) => {
  try {
    const rounds = await Round.find().sort({ roundNumber: 1 });
    
    // Dynamically update status based on current time if scheduled or active
    const now = new Date();
    const updatedRounds = await Promise.all(rounds.map(async (round) => {
      let rObj = round.toObject();
      if (round.status === 'SCHEDULED' && now >= new Date(round.startAt) && now <= new Date(round.endAt)) {
        round.status = 'ACTIVE';
        round.active = true;
        await round.save();
        rObj.status = 'ACTIVE';
        rObj.active = true;
      } else if (round.status === 'ACTIVE' && now > new Date(round.endAt)) {
        round.status = 'CLOSED';
        round.active = false;
        await round.save();
        rObj.status = 'CLOSED';
        rObj.active = false;
      }
      return rObj;
    }));

    res.json(updatedRounds);
  } catch (error) {
    console.error('Fetch Rounds Error:', error);
    res.status(500).json({ message: 'Failed to fetch rounds' });
  }
});

// Admin-only endpoints below
router.use(protect, adminOnly);

// @route POST /api/admin/rounds
router.post('/', async (req, res) => {
  try {
    const { roundNumber, name, type, description, instructions, startAt, endAt, maxMarks, qualificationCriteria, githubRepoUrl } = req.body;
    const startDate = startAt ? new Date(startAt) : new Date();
    const endDate = endAt ? new Date(endAt) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const configuredMaxMarks = Number(maxMarks ?? 100);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({ message: 'End time must be later than start time' });
    }
    if (!Number.isFinite(configuredMaxMarks) || configuredMaxMarks <= 0) {
      return res.status(400).json({ message: 'Maximum marks must be greater than zero' });
    }
    
    const existing = await Round.findOne({ roundNumber });
    if (existing) {
      return res.status(400).json({ message: `Round ${roundNumber} already exists` });
    }

    const round = new Round({
      roundNumber,
      name,
      type,
      description,
      instructions,
      startAt: startDate,
      endAt: endDate,
      maxMarks: configuredMaxMarks,
      qualificationCriteria: qualificationCriteria || { minErrorsSolved: 120, minPercentage: 60, minMarks: 60, ruleType: 'OR' },
      githubRepoUrl: githubRepoUrl || ''
    });

    await round.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'ROUND_CREATED',
      roundNumber,
      details: `Created Round ${roundNumber}: ${name}`
    });

    res.status(201).json(round);
  } catch (error) {
    console.error('Create Round Error:', error);
    res.status(500).json({ message: 'Failed to create round' });
  }
});

// @route PUT /api/admin/rounds/:id
router.put('/:id', async (req, res) => {
  try {
    const round = await Round.findById(req.params.id);
    if (!round) return res.status(404).json({ message: 'Round not found' });

    const nextStartAt = req.body.startAt !== undefined ? new Date(req.body.startAt) : round.startAt;
    const nextEndAt = req.body.endAt !== undefined ? new Date(req.body.endAt) : round.endAt;
    const nextMaxMarks = req.body.maxMarks !== undefined ? Number(req.body.maxMarks) : round.maxMarks;
    if (!Number.isFinite(new Date(nextStartAt).getTime()) || !Number.isFinite(new Date(nextEndAt).getTime()) || new Date(nextEndAt) <= new Date(nextStartAt)) {
      return res.status(400).json({ message: 'End time must be later than start time' });
    }
    if (!Number.isFinite(nextMaxMarks) || nextMaxMarks <= 0) {
      return res.status(400).json({ message: 'Maximum marks must be greater than zero' });
    }

    const fields = ['name', 'description', 'instructions', 'startAt', 'endAt', 'status', 'maxMarks', 'qualificationCriteria', 'githubRepoUrl', 'githubBranch', 'active'];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'startAt' || field === 'endAt') {
          round[field] = new Date(req.body[field]);
        } else {
          round[field] = req.body[field];
        }
      }
    });

    await round.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'ROUND_UPDATED',
      roundNumber: round.roundNumber,
      details: `Updated configuration for Round ${round.roundNumber}`
    });

    res.json(round);
  } catch (error) {
    console.error('Update Round Error:', error);
    res.status(500).json({ message: 'Failed to update round' });
  }
});

// @route POST /api/admin/rounds/:id/start
router.post('/:id/start', async (req, res) => {
  try {
    const round = await Round.findById(req.params.id);
    if (!round) return res.status(404).json({ message: 'Round not found' });

    const now = new Date();
    const previousDuration = round.endAt && round.startAt ? new Date(round.endAt) - new Date(round.startAt) : 0;
    if (!round.endAt || new Date(round.endAt) <= now) {
      round.endAt = new Date(now.getTime() + (previousDuration > 0 ? previousDuration : 2 * 60 * 60 * 1000));
    }
    round.status = 'ACTIVE';
    round.active = true;
    round.startAt = now;
    await round.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'ROUND_STARTED',
      roundNumber: round.roundNumber,
      details: `Manually started Round ${round.roundNumber}`
    });

    res.json({ message: `Round ${round.roundNumber} is now ACTIVE`, round });
  } catch (error) {
    console.error('Start Round Error:', error);
    res.status(500).json({ message: 'Failed to start round' });
  }
});

// @route POST /api/admin/rounds/:id/pause
router.post('/:id/pause', async (req, res) => {
  try {
    const round = await Round.findById(req.params.id);
    if (!round) return res.status(404).json({ message: 'Round not found' });

    round.status = 'PAUSED';
    round.active = false;
    await round.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'ROUND_PAUSED',
      roundNumber: round.roundNumber,
      details: `Paused Round ${round.roundNumber}`
    });

    res.json({ message: `Round ${round.roundNumber} PAUSED`, round });
  } catch (error) {
    console.error('Pause Round Error:', error);
    res.status(500).json({ message: 'Failed to pause round' });
  }
});

// @route POST /api/admin/rounds/:id/close
router.post('/:id/close', async (req, res) => {
  try {
    const round = await Round.findById(req.params.id);
    if (!round) return res.status(404).json({ message: 'Round not found' });

    round.status = 'CLOSED';
    round.active = false;
    round.endAt = new Date();
    await round.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'ROUND_CLOSED',
      roundNumber: round.roundNumber,
      details: `Closed Round ${round.roundNumber}`
    });

    res.json({ message: `Round ${round.roundNumber} CLOSED`, round });
  } catch (error) {
    console.error('Close Round Error:', error);
    res.status(500).json({ message: 'Failed to close round' });
  }
});

// @route POST /api/admin/rounds/:id/reopen
router.post('/:id/reopen', async (req, res) => {
  try {
    const { minutesToExtend = 60 } = req.body;
    const round = await Round.findById(req.params.id);
    if (!round) return res.status(404).json({ message: 'Round not found' });

    round.status = 'ACTIVE';
    round.active = true;
    round.startAt = now;
    round.endAt = new Date(Date.now() + minutesToExtend * 60 * 1000);
    await round.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'ROUND_REOPENED',
      roundNumber: round.roundNumber,
      details: `Reopened Round ${round.roundNumber} for ${minutesToExtend} minutes`
    });

    res.json({ message: `Round ${round.roundNumber} REOPENED`, round });
  } catch (error) {
    console.error('Reopen Round Error:', error);
    res.status(500).json({ message: 'Failed to reopen round' });
  }
});

module.exports = router;
