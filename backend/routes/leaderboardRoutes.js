const express = require('express');
const router = express.Router();
const Evaluation = require('../models/Evaluation');
const Round = require('../models/Round');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/authMiddleware');

// @route GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.findOne() || { leaderboardPublic: true };
    
    // If private and user not logged in or not admin, return standard message
    if (!settings.leaderboardPublic && (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer'))) {
      return res.json({ public: false, leaderboard: [], message: 'Leaderboard is currently hidden by Admin.' });
    }

    const [evaluations, rounds] = await Promise.all([
      Evaluation.find().populate('teamId'),
      Round.find().select('roundNumber name maxMarks').sort({ roundNumber: 1 })
    ]);

    // Aggregate by participant or team across rounds
    // Map of teamCode/participant list -> scores
    const leaderboardMap = {};

    evaluations.forEach(ev => {
      const participants = [...new Set(ev.participantIds || [])].sort();
      const key = participants.length ? participants.join('|') : (ev.teamCode || String(ev.teamId?._id || ev.teamId));
      if (!leaderboardMap[key]) {
        leaderboardMap[key] = {
          teamCode: ev.teamCode,
          participants,
          roundScores: {},
          round1Marks: 0,
          round2Marks: 0,
          round3Marks: 0,
          totalMarks: 0,
          totalMaxMarks: 0,
          round1Status: 'NOT_EVALUATED',
          round2Status: 'NOT_EVALUATED',
          round3Status: 'NOT_EVALUATED',
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
        item.finalStatus = ev.status;
      }
      if (ev.roundNumber === 1) {
        item.round1Marks = ev.marks;
        item.round1Status = ev.status;
      } else if (ev.roundNumber === 2) {
        item.round2Marks = ev.marks;
        item.round2Status = ev.status;
      } else if (ev.roundNumber === 3) {
        item.round3Marks = ev.marks;
        item.round3Status = ev.status;
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
