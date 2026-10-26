const express = require('express');
const router = express.Router();
const Evaluation = require('../models/Evaluation');
const Round = require('../models/Round');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/authMiddleware');

// @route GET /api/leaderboard
router.get('/', (req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  return next();
}, async (req, res) => {
  try {
    const settings = await Settings.findOne() || { leaderboardPublic: true };
    const selectedRound = req.query.roundNumber;
    if (selectedRound && selectedRound !== 'all' &&
        (!Number.isInteger(Number(selectedRound)) || Number(selectedRound) < 1)) {
      return res.status(400).json({ message: 'Choose a valid round number' });
    }
    
    // If private and user not logged in or not admin, return standard message
    if (!settings.leaderboardPublic && req.user?.role !== 'ADMIN') {
      return res.json({ public: false, leaderboard: [], message: 'Leaderboard is currently hidden by Admin.' });
    }

    const evaluationFilter = {};
    const roundQuery = {};
    if (selectedRound && selectedRound !== 'all') {
      evaluationFilter.roundNumber = Number(selectedRound);
      roundQuery.roundNumber = Number(selectedRound);
    }
    const [evaluations, rounds] = await Promise.all([
      Evaluation.find(evaluationFilter).populate({
        path: 'teamId',
        select: 'teamCode branchId teamAccountId',
        populate: { path: 'branchId', select: 'name' }
      }),
      Round.find(roundQuery).select('roundNumber name maxMarks').sort({ roundNumber: 1 })
    ]);

    // Aggregate by participant or team across rounds
    // Map of teamCode/participant list -> scores
    const leaderboardMap = {};

    evaluations.forEach(ev => {
      const participants = [...new Set(ev.participantIds || [])].sort();
      const key = ev.teamId?.teamAccountId
        ? String(ev.teamId.teamAccountId)
        : participants.length ? participants.join('|') : (ev.teamCode || String(ev.teamId?._id || ev.teamId));
      if (!leaderboardMap[key]) {
        leaderboardMap[key] = {
          teamCode: ev.teamCode,
          ...(req.user?.role === 'ADMIN' ? { branchName: ev.teamId?.branchId?.name || '—' } : {}),
          participants,
          roundScores: {},
          totalMarks: 0,
          totalMaxMarks: 0,
          finalStatus: ev.status,
          latestRound: 0
        };
      }

      const item = leaderboardMap[key];
      item.roundScores[ev.roundNumber] = {
        marks: ev.marks,
        maxMarks: ev.maxMarks,
        status: ev.status
      };
      if (ev.roundNumber >= item.latestRound) {
        item.latestRound = ev.roundNumber;
        item.teamCode = ev.teamCode;
        if (req.user?.role === 'ADMIN') item.branchName = ev.teamId?.branchId?.name || '—';
        item.finalStatus = ev.status;
      }
      item.totalMarks = Object.values(item.roundScores).reduce((total, score) => total + (Number(score.marks) || 0), 0);
      item.totalMaxMarks = Object.values(item.roundScores).reduce((total, score) => total + (Number(score.maxMarks) || 0), 0);
    });

    const leaderboardList = Object.values(leaderboardMap)
      .sort((a, b) => b.totalMarks - a.totalMarks)
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }));

    res.json({
      public: settings.leaderboardPublic,
      rounds,
      leaderboard: leaderboardList
    });
  } catch (error) {
    console.error('Fetch Leaderboard Error:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
