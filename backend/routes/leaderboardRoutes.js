const express = require('express');
const router = express.Router();
const Evaluation = require('../models/Evaluation');
const RoundTeam = require('../models/RoundTeam');
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

    const evaluations = await Evaluation.find().populate('teamId');

    // Aggregate by participant or team across rounds
    // Map of teamCode/participant list -> scores
    const leaderboardMap = {};

    evaluations.forEach(ev => {
      const key = ev.teamCode || ev.teamId;
      if (!leaderboardMap[key]) {
        leaderboardMap[key] = {
          teamCode: ev.teamCode,
          participants: ev.participantIds || [],
          round1Marks: 0,
          round2Marks: 0,
          round3Marks: 0,
          totalMarks: 0,
          round1Status: 'NOT_EVALUATED',
          round2Status: 'NOT_EVALUATED',
          round3Status: 'NOT_EVALUATED',
          finalStatus: ev.status
        };
      }

      if (ev.roundNumber === 1) {
        leaderboardMap[key].round1Marks = ev.marks;
        leaderboardMap[key].round1Status = ev.status;
      } else if (ev.roundNumber === 2) {
        leaderboardMap[key].round2Marks = ev.marks;
        leaderboardMap[key].round2Status = ev.status;
      } else if (ev.roundNumber === 3) {
        leaderboardMap[key].round3Marks = ev.marks;
        leaderboardMap[key].round3Status = ev.status;
      }

      leaderboardMap[key].totalMarks = (leaderboardMap[key].round1Marks || 0) + (leaderboardMap[key].round2Marks || 0) + (leaderboardMap[key].round3Marks || 0);
    });

    const leaderboardList = Object.values(leaderboardMap)
      .sort((a, b) => b.totalMarks - a.totalMarks)
      .map((item, index) => ({
        rank: index + 1,
        ...item
      }));

    res.json({
      public: settings.leaderboardPublic,
      leaderboard: leaderboardList
    });
  } catch (error) {
    console.error('Fetch Leaderboard Error:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
