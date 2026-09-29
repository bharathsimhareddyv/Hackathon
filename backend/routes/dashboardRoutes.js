const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');
const Round = require('../models/Round');
const RoundTeam = require('../models/RoundTeam');
const Project = require('../models/Project');
const Evaluation = require('../models/Evaluation');
const Submission = require('../models/Submission');
const Terms = require('../models/Terms');
const TermsAcceptance = require('../models/TermsAcceptance');
const ActivityLog = require('../models/ActivityLog');
const TeamAccount = require('../models/TeamAccount');
const ProgressClaim = require('../models/ProgressClaim');
const { protect, adminOnly, studentOnly } = require('../middleware/authMiddleware');

// @route GET /api/student/dashboard
router.get('/student', protect, studentOnly, async (req, res) => {
  try {
    const participant = await Participant.findById(req.user._id).select('-passwordHash');
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    // Check terms acceptance
    const currentTerms = await Terms.findOne({ isCurrent: true });
    let termsAccepted = participant.termsAccepted;
    if (currentTerms) {
      const acceptance = await TermsAcceptance.findOne({
        participantId: participant.arohanId,
        termsVersion: currentTerms.version
      });
      termsAccepted = !!acceptance;
    }

    // Get all rounds
    const rounds = await Round.find().sort({ roundNumber: 1 });

    // Current active or qualification round
    const activeRound = rounds.find(r => r.status === 'ACTIVE') || rounds.find(r => r.roundNumber === participant.currentRound) || rounds[0];

    let currentTeam = null;
    let currentProject = null;
    let currentEvaluation = null;
    let mySubmissions = [];

    if (activeRound) {
      currentTeam = await RoundTeam.findOne({
        roundNumber: activeRound.roundNumber,
        participantIds: participant.arohanId
      }).populate('projectId');

      if (currentTeam && currentTeam.projectId) {
        currentProject = currentTeam.projectId;
      }

      if (currentTeam) {
        currentEvaluation = await Evaluation.findOne({
          roundNumber: activeRound.roundNumber,
          teamId: currentTeam._id
        });
      }

      mySubmissions = await Submission.find({
        participantId: participant.arohanId,
        roundNumber: activeRound.roundNumber
      }).sort({ submittedAt: -1 });
    }

    // Fetch previous evaluations for past rounds
    const evaluationsAll = await Evaluation.find({
      participantIds: participant.arohanId
    }).sort({ roundNumber: 1 });

    res.json({
      participant: {
        arohanId: participant.arohanId,
        name: participant.name,
        college: participant.college,
        currentRound: participant.currentRound,
        status: participant.status,
        termsAccepted
      },
      currentTermsVersion: currentTerms ? currentTerms.version : '1.0',
      rounds,
      activeRound,
      currentTeam,
      currentProject,
      currentEvaluation,
      mySubmissions,
      evaluationsAll
    });
  } catch (error) {
    console.error('Student Dashboard Error:', error);
    res.status(500).json({ message: 'Failed to load student dashboard' });
  }
});

// @route GET /api/admin/dashboard
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const totalParticipants = await Participant.countDocuments();
    const activeParticipants = await Participant.countDocuments({ active: true });
    const totalTeams = await TeamAccount.countDocuments();
    const activeTeams = await TeamAccount.countDocuments({ status: 'ACTIVE' });
    const pendingProgressClaims = await ProgressClaim.countDocuments({ status: 'PENDING' });

    const round1Teams = await RoundTeam.countDocuments({ roundNumber: 1 });
    const round1Qualified = await Evaluation.countDocuments({ roundNumber: 1, status: 'QUALIFIED' });
    const round1NotQualified = await Evaluation.countDocuments({ roundNumber: 1, status: 'NOT_QUALIFIED' });

    const round2Teams = await RoundTeam.countDocuments({ roundNumber: 2 });
    const round2Qualified = await Evaluation.countDocuments({ roundNumber: 2, status: 'QUALIFIED' });

    const round3Teams = await RoundTeam.countDocuments({ roundNumber: 3 });
    const finalSubmissions = await Submission.countDocuments({ roundNumber: 3 });

    const rounds = await Round.find().sort({ roundNumber: 1 });
    const activeRound = rounds.find(r => r.status === 'ACTIVE') || null;

    const recentActivityLogs = await ActivityLog.find().sort({ timestamp: -1 }).limit(10);

    res.json({
      summary: {
        totalParticipants,
        activeParticipants,
        totalTeams,
        activeTeams,
        pendingProgressClaims,
        round1Teams,
        round1Qualified,
        round1NotQualified,
        round2Teams,
        round2Qualified,
        round3Teams,
        finalSubmissions
      },
      rounds,
      activeRound,
      recentActivityLogs
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).json({ message: 'Failed to load admin dashboard' });
  }
});

module.exports = router;
