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
const { roundsVisibleToBranch } = require('../utils/roundVisibility');

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

    const accessibleRounds = await Round.find(roundsVisibleToBranch(participant.branchId)).sort({ roundNumber: 1 });
    const assignedRounds = await RoundTeam.find({
      participantIds: participant.arohanId,
      roundNumber: { $in: accessibleRounds.map(round => round.roundNumber) }
    }).select('roundNumber teamCode');
    const assignedRoundNumbers = [...new Set(assignedRounds.map(item => item.roundNumber))];
    const rounds = accessibleRounds.filter(round => assignedRoundNumbers.includes(round.roundNumber));

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
    const allSubmissions = await Submission.find({ participantId: participant.arohanId }).sort({ submittedAt: -1 });
    const totalMarks = evaluationsAll.reduce((total, evaluation) => total + (Number(evaluation.marks) || 0), 0);
    const currentMemberIndex = currentTeam?.participantIds?.indexOf(participant.arohanId) ?? -1;
    const visibleStudentName = participant.name ||
      (currentMemberIndex >= 0 ? currentTeam.memberNames?.[currentMemberIndex] : null) ||
      null;

    res.json({
      participant: {
        arohanId: participant.arohanId,
        name: visibleStudentName,
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
      evaluationsAll,
      personalStats: {
        assignedRounds: assignedRoundNumbers.length,
        totalSubmissions: allSubmissions.length,
        evaluatedRounds: evaluationsAll.length,
        totalMarks,
        averageMarks: evaluationsAll.length ? Math.round(totalMarks / evaluationsAll.length) : 0
      }
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
    const rounds = await Round.find().sort({ roundNumber: 1 });
    const activeRound = rounds.find(r => r.status === 'ACTIVE') || null;
    const roundStats = await Promise.all(rounds.map(async round => {
      const [teams, submissions, evaluations, qualifiedTeams, notQualifiedTeams] = await Promise.all([
        RoundTeam.countDocuments({ roundNumber: round.roundNumber }),
        Submission.countDocuments({ roundNumber: round.roundNumber }),
        Evaluation.countDocuments({ roundNumber: round.roundNumber }),
        Evaluation.countDocuments({ roundNumber: round.roundNumber, status: 'QUALIFIED' }),
        Evaluation.countDocuments({ roundNumber: round.roundNumber, status: 'NOT_QUALIFIED' })
      ]);
      return {
        roundNumber: round.roundNumber,
        name: round.name,
        status: round.status,
        teams,
        submissions,
        evaluations,
        qualifiedTeams,
        notQualifiedTeams
      };
    }));

    const recentActivityLogs = await ActivityLog.find().sort({ timestamp: -1 }).limit(10);

    res.json({
      summary: {
        totalParticipants,
        activeParticipants,
        totalTeams,
        activeTeams,
        pendingProgressClaims
      },
      rounds,
      roundStats,
      activeRound,
      recentActivityLogs
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).json({ message: 'Failed to load admin dashboard' });
  }
});

module.exports = router;
