const express = require('express');
const bcrypt = require('bcryptjs');
const Branch = require('../models/Branch');
const TeamAccount = require('../models/TeamAccount');
const Participant = require('../models/Participant');
const Round = require('../models/Round');
const Submission = require('../models/Submission');
const RoundTeam = require('../models/RoundTeam');
const Evaluation = require('../models/Evaluation');
const ProgressClaim = require('../models/ProgressClaim');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { roundsVisibleToBranch } = require('../utils/roundVisibility');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/', async (req, res) => {
  try {
    const branches = await Branch.find()
      .select('name username loginEnabled createdAt')
      .sort({ name: 1 });
    const summaries = await Promise.all(branches.map(async branch => {
      const branchId = branch._id;
      const [teams, students, roundNumbers, submissions] = await Promise.all([
        TeamAccount.countDocuments({ branchId }),
        Participant.countDocuments({ branchId }),
        Round.find(roundsVisibleToBranch(branchId)).distinct('roundNumber'),
        Submission.countDocuments({ branchId })
      ]);
      const [projects, activeTeams, activeStudents] = await Promise.all([
        Project.countDocuments({
          roundNumber: { $in: roundNumbers },
          $or: [{ branchId }, { assignedBranchIds: branchId }]
        }),
        TeamAccount.countDocuments({ branchId, status: 'ACTIVE' }),
        Participant.countDocuments({ branchId, active: true })
      ]);
      return {
        ...branch.toObject(),
        stats: {
          teams,
          activeTeams,
          students,
          activeStudents,
          rounds: roundNumbers.length,
          projects,
          submissions
        }
      };
    }));
    res.json(summaries);
  } catch (error) {
    console.error('Fetch Branches Error:', error);
    res.status(500).json({ message: 'Failed to fetch branches' });
  }
});

router.get('/:id/report', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).select('name username loginEnabled createdAt');
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    const branchId = branch._id;
    const [students, teamAccounts, rounds, studentIds, teamIds] = await Promise.all([
      Participant.find({ branchId }).select('arohanId name active status currentRound createdAt').sort({ arohanId: 1 }),
      TeamAccount.find({ branchId }).select('loginId status currentRound memberNames createdAt').sort({ loginId: 1 }),
      Round.find(roundsVisibleToBranch(branchId)).sort({ roundNumber: 1 }),
      Participant.find({ branchId }).distinct('arohanId'),
      TeamAccount.find({ branchId }).distinct('_id')
    ]);
    const [submissions, assignments, claims, evaluations, projects] = await Promise.all([
      Submission.find({
        $or: [{ branchId }, { participantId: { $in: studentIds } }]
      }).select('roundNumber participantId teamCode status submittedAt').sort({ submittedAt: -1 }),
      RoundTeam.find({
        $or: [{ branchId }, { teamAccountId: { $in: teamIds } }]
      }).select('roundNumber teamCode participantIds projectId'),
      ProgressClaim.find({ teamAccountId: { $in: teamIds } }).select('roundNumber teamCode status submittedAt'),
      Evaluation.find({ participantIds: { $in: studentIds } }).select('roundNumber teamCode marks maxMarks status'),
      Project.find({
        roundNumber: { $in: rounds.map(round => round.roundNumber) },
        $or: [{ branchId }, { assignedBranchIds: branchId }]
      }).select('name roundNumber githubUrl filePath')
    ]);

    const roundStats = rounds.map(round => {
      const roundAssignments = assignments.filter(item => item.roundNumber === round.roundNumber);
      return {
        roundNumber: round.roundNumber,
        name: round.name,
        status: round.status,
        startAt: round.startAt,
        endAt: round.endAt,
        teams: roundAssignments.length,
        assignedStudents: new Set(roundAssignments.flatMap(item => item.participantIds || [])).size,
        submissions: submissions.filter(item => item.roundNumber === round.roundNumber).length,
        progressClaims: claims.filter(item => item.roundNumber === round.roundNumber).length,
        evaluations: evaluations.filter(item => item.roundNumber === round.roundNumber).length,
        projects: projects.filter(item => item.roundNumber === round.roundNumber).length
      };
    });

    res.json({
      branch,
      summary: {
        students: students.length,
        activeStudents: students.filter(student => student.active).length,
        teams: teamAccounts.length,
        activeTeams: teamAccounts.filter(team => team.status === 'ACTIVE').length,
        rounds: rounds.length,
        assignedProjects: projects.length,
        submissions: submissions.length,
        progressClaims: claims.length,
        evaluations: evaluations.length,
        qualifiedTeams: evaluations.filter(item => item.status === 'QUALIFIED').length
      },
      roundStats,
      students,
      teams: teamAccounts.map(team => ({
        ...team.toObject(),
        assignments: assignments.filter(item => String(item.teamCode) === String(team.loginId))
          .map(item => ({
            roundNumber: item.roundNumber,
            participantIds: item.participantIds,
            projectId: item.projectId
          }))
      })),
      projects,
      submissions,
      progressClaims: claims,
      evaluations
    });
  } catch (error) {
    console.error('Fetch Branch Report Error:', error);
    res.status(500).json({ message: 'Failed to generate branch report' });
  }
});

router.post('/', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || name.length > 100 || !username || username.length > 50 || password.length < 8) {
      return res.status(400).json({
        message: 'Branch name and username are required, and the password must be at least 8 characters'
      });
    }

    const existing = await Branch.findOne({ $or: [{ name }, { username }] });
    if (existing) {
      return res.status(409).json({ message: 'A branch already uses that name or username' });
    }

    const branch = await Branch.create({
      name,
      username,
      passwordHash: await bcrypt.hash(password, 10)
    });
    res.status(201).json({
      _id: branch._id,
      name: branch.name,
      username: branch.username,
      createdAt: branch.createdAt
    });
  } catch (error) {
    console.error('Create Branch Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A branch already uses that name or username' });
    }
    res.status(500).json({ message: 'Failed to create branch' });
  }
});

router.post('/:id/reset-password', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    const temporaryPassword = generateRandomPassword();
    branch.passwordHash = await bcrypt.hash(temporaryPassword, 10);
    branch.temporaryPasswordPlain = temporaryPassword;
    await branch.save();
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'BRANCH_PASSWORD_RESET',
      details: `Reset password for branch ${branch.name} (${branch.username})`
    });
    res.json({ message: `Password reset for ${branch.name}`, username: branch.username, temporaryPassword });
  } catch (error) {
    console.error('Reset Branch Password Error:', error);
    res.status(500).json({ message: 'Failed to reset branch password' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    if (!branch.loginEnabled) return res.status(409).json({ message: 'This branch login is already disabled' });
    branch.loginEnabled = false;
    await branch.save();
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'BRANCH_LOGIN_DELETED',
      details: `Disabled branch login for ${branch.name}; retained branch data`
    });
    res.json({ message: `Branch login disabled for ${branch.name}. Its branch record, teams, students, rounds, and submissions were retained.` });
  } catch (error) {
    console.error('Delete Branch Login Error:', error);
    res.status(500).json({ message: 'Failed to delete branch login' });
  }
});

router.post('/:id/enable', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    branch.loginEnabled = true;
    await branch.save();
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'BRANCH_LOGIN_ENABLED',
      details: `Enabled branch login for ${branch.name} (${branch.username})`
    });
    res.json({ message: `Branch login enabled for ${branch.name}` });
  } catch (error) {
    console.error('Enable Branch Login Error:', error);
    res.status(500).json({ message: 'Failed to enable branch login' });
  }
});

module.exports = router;
