const express = require('express');
const bcrypt = require('bcryptjs');
const Viewer = require('../models/Viewer');
const Branch = require('../models/Branch');
const Round = require('../models/Round');
const RoundTeam = require('../models/RoundTeam');
const Participant = require('../models/Participant');
const Submission = require('../models/Submission');
const ProgressClaim = require('../models/ProgressClaim');
const Evaluation = require('../models/Evaluation');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly, viewerOnly } = require('../middleware/authMiddleware');
const { generateRandomPassword } = require('../utils/passwordGenerator');

const router = express.Router();

function sanitizeViewer(viewer) {
  return {
    _id: viewer._id,
    name: viewer.name,
    username: viewer.username,
    loginEnabled: viewer.loginEnabled,
    roundNumbers: viewer.roundNumbers,
    allBranches: viewer.allBranches,
    branchIds: viewer.branchIds,
    permissions: viewer.permissions,
    createdAt: viewer.createdAt
  };
}

async function validateAccessSettings(body) {
  if (!Array.isArray(body.roundNumbers) || !body.roundNumbers.length ||
      body.roundNumbers.some(number => !Number.isInteger(Number(number)) || Number(number) < 1)) {
    return 'Select at least one valid round';
  }
  const roundNumbers = [...new Set(body.roundNumbers.map(Number))];
  const roundCount = await Round.countDocuments({ roundNumber: { $in: roundNumbers } });
  if (roundCount !== roundNumbers.length) return 'One or more selected rounds do not exist';

  if (typeof body.allBranches !== 'boolean') return 'Choose whether the viewer can see all branches or selected branches';
  const branchIds = Array.isArray(body.branchIds) ? [...new Set(body.branchIds.map(String))] : [];
  if (!body.allBranches) {
    if (!branchIds.length || branchIds.some(id => !/^[a-f\d]{24}$/i.test(id))) {
      return 'Select at least one valid branch';
    }
    if (await Branch.countDocuments({ _id: { $in: branchIds } }) !== branchIds.length) {
      return 'One or more selected branches do not exist';
    }
  }

  const permissionNames = ['roundProgress', 'branchStatistics', 'branchAverages'];
  if (!body.permissions || permissionNames.some(name => typeof body.permissions[name] !== 'boolean')) {
    return 'Choose each viewer permission explicitly';
  }
  if (!permissionNames.some(name => body.permissions[name])) {
    return 'Enable at least one viewer permission';
  }
  return null;
}

router.use('/admin', protect, adminOnly);

router.get('/admin', async (req, res) => {
  try {
    const [viewers, rounds, branches] = await Promise.all([
      Viewer.find().sort({ name: 1 }),
      Round.find().select('roundNumber name').sort({ roundNumber: 1 }),
      Branch.find().select('name').sort({ name: 1 })
    ]);
    res.json({
      viewers: viewers.map(sanitizeViewer),
      rounds,
      branches
    });
  } catch (error) {
    console.error('Fetch Viewers Error:', error);
    res.status(500).json({ message: 'Failed to fetch viewers' });
  }
});

router.post('/admin', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || name.length > 100 || !username || username.length > 50 || password.length < 8) {
      return res.status(400).json({ message: 'Enter a viewer name, username, and password of at least 8 characters' });
    }
    const invalidSettings = await validateAccessSettings(req.body);
    if (invalidSettings) return res.status(400).json({ message: invalidSettings });
    const viewer = await Viewer.create({
      name,
      username,
      passwordHash: await bcrypt.hash(password, 10),
      roundNumbers: [...new Set(req.body.roundNumbers.map(Number))],
      allBranches: req.body.allBranches,
      branchIds: req.body.allBranches ? [] : [...new Set(req.body.branchIds.map(String))],
      permissions: req.body.permissions
    });
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'VIEWER_CREATED',
      details: `Created viewer ${viewer.name} (${viewer.username})`
    });
    res.status(201).json(sanitizeViewer(viewer));
  } catch (error) {
    console.error('Create Viewer Error:', error);
    if (error.code === 11000) return res.status(409).json({ message: 'A viewer already uses that username' });
    res.status(500).json({ message: 'Failed to create viewer' });
  }
});

router.put('/admin/:id', async (req, res) => {
  try {
    const viewer = await Viewer.findById(req.params.id);
    if (!viewer) return res.status(404).json({ message: 'Viewer not found' });
    const name = String(req.body.name ?? viewer.name).trim();
    const username = String(req.body.username ?? viewer.username).trim().toLowerCase();
    if (!name || name.length > 100 || !username || username.length > 50) {
      return res.status(400).json({ message: 'Enter a valid viewer name and username' });
    }
    const settings = {
      roundNumbers: req.body.roundNumbers ?? viewer.roundNumbers,
      allBranches: req.body.allBranches ?? viewer.allBranches,
      branchIds: req.body.branchIds ?? viewer.branchIds.map(String),
      permissions: req.body.permissions ?? {
        roundProgress: viewer.permissions.roundProgress,
        branchStatistics: viewer.permissions.branchStatistics,
        branchAverages: viewer.permissions.branchAverages
      }
    };
    const invalidSettings = await validateAccessSettings(settings);
    if (invalidSettings) return res.status(400).json({ message: invalidSettings });
    viewer.name = name;
    viewer.username = username;
    viewer.roundNumbers = [...new Set(settings.roundNumbers.map(Number))];
    viewer.allBranches = settings.allBranches;
    viewer.branchIds = settings.allBranches ? [] : [...new Set(settings.branchIds.map(String))];
    viewer.permissions = settings.permissions;
    if (typeof req.body.loginEnabled === 'boolean') viewer.loginEnabled = req.body.loginEnabled;
    await viewer.save();
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'VIEWER_UPDATED',
      details: `Updated viewer access for ${viewer.name} (${viewer.username})`
    });
    res.json(sanitizeViewer(viewer));
  } catch (error) {
    console.error('Update Viewer Error:', error);
    if (error.code === 11000) return res.status(409).json({ message: 'A viewer already uses that username' });
    res.status(500).json({ message: 'Failed to update viewer' });
  }
});

router.post('/admin/:id/reset-password', async (req, res) => {
  try {
    const viewer = await Viewer.findById(req.params.id);
    if (!viewer) return res.status(404).json({ message: 'Viewer not found' });
    const temporaryPassword = generateRandomPassword();
    viewer.passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await viewer.save();
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'VIEWER_PASSWORD_RESET',
      details: `Reset password for viewer ${viewer.name} (${viewer.username})`
    });
    res.json({ username: viewer.username, temporaryPassword });
  } catch (error) {
    console.error('Reset Viewer Password Error:', error);
    res.status(500).json({ message: 'Failed to reset viewer password' });
  }
});

router.delete('/admin/:id', async (req, res) => {
  try {
    const viewer = await Viewer.findById(req.params.id);
    if (!viewer) return res.status(404).json({ message: 'Viewer not found' });
    viewer.loginEnabled = false;
    await viewer.save();
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'VIEWER_LOGIN_DISABLED',
      details: `Disabled viewer login for ${viewer.name} (${viewer.username})`
    });
    res.json({ message: 'Viewer login disabled; settings and history were retained' });
  } catch (error) {
    console.error('Disable Viewer Error:', error);
    res.status(500).json({ message: 'Failed to disable viewer' });
  }
});

router.post('/admin/:id/enable', async (req, res) => {
  try {
    const viewer = await Viewer.findById(req.params.id);
    if (!viewer) return res.status(404).json({ message: 'Viewer not found' });
    viewer.loginEnabled = true;
    await viewer.save();
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'VIEWER_LOGIN_ENABLED',
      details: `Enabled viewer login for ${viewer.name} (${viewer.username})`
    });
    res.json({ message: 'Viewer login enabled' });
  } catch (error) {
    console.error('Enable Viewer Error:', error);
    res.status(500).json({ message: 'Failed to enable viewer' });
  }
});

router.get('/dashboard', protect, viewerOnly, async (req, res) => {
  try {
    const viewer = req.user;
    const permissions = viewer.permissions || {};
    const rounds = await Round.find({ roundNumber: { $in: viewer.roundNumbers } })
      .select('roundNumber name status startAt endAt')
      .sort({ roundNumber: 1 });
    const branches = await Branch.find(
      viewer.allBranches ? {} : { _id: { $in: viewer.branchIds } }
    ).select('name').sort({ name: 1 });
    const branchMap = new Map(branches.map(branch => [String(branch._id), branch.name]));
    const selectedBranchIds = branches.map(branch => branch._id);
    const roundNumbers = rounds.map(round => round.roundNumber);
    const assignments = roundNumbers.length && selectedBranchIds.length
      ? await RoundTeam.find({
        roundNumber: { $in: roundNumbers },
        branchId: { $in: selectedBranchIds }
      }).select('roundNumber branchId teamCode memberNames participantIds teamAccountId projectId')
      : [];
    const teamIds = assignments.map(team => team._id);
    const studentIds = [...new Set(assignments.flatMap(team => team.participantIds || []))];
    const accountIds = [...new Set(assignments.map(team => team.teamAccountId).filter(Boolean).map(String))];
    const [participants, evaluations, submissions, claims, projects] = await Promise.all([
      Participant.find({ arohanId: { $in: studentIds } }).select('arohanId name'),
      Evaluation.find({ roundNumber: { $in: roundNumbers }, teamId: { $in: teamIds } })
        .select('roundNumber teamId marks maxMarks status'),
      Submission.find({
        roundNumber: { $in: roundNumbers },
        $or: [{ teamId: { $in: teamIds } }, { participantId: { $in: studentIds } }]
      }).select('roundNumber teamId participantId status submittedAt'),
      ProgressClaim.find({
        roundNumber: { $in: roundNumbers },
        $or: [{ teamId: { $in: teamIds } }, { teamAccountId: { $in: accountIds } }]
      }).select('roundNumber teamId teamAccountId teamCode claimedPercentage claimedErrorsSolved status submittedAt'),
      Project.find({
        roundNumber: { $in: roundNumbers },
        $or: [
          { branchId: { $in: selectedBranchIds } },
          { assignedBranchIds: { $in: selectedBranchIds } }
        ]
      }).select('name roundNumber branchId assignedBranchIds')
    ]);
    const participantNames = new Map(participants.map(participant => [participant.arohanId, participant.name || '']));
    const evaluationMap = new Map(evaluations.map(item => [`${item.roundNumber}:${item.teamId}`, item]));
    const claimMap = new Map();
    claims.forEach(item => {
      const key = `${item.roundNumber}:${item.teamId}`;
      const previous = claimMap.get(key);
      if (!previous || new Date(item.submittedAt) > new Date(previous.submittedAt)) claimMap.set(key, item);
    });

    const roundProgress = rounds.map(round => {
      const teams = assignments.filter(team => team.roundNumber === round.roundNumber).map(team => {
        const evaluation = evaluationMap.get(`${round.roundNumber}:${team._id}`);
        const claim = claimMap.get(`${round.roundNumber}:${team._id}`);
        const teamSubmissions = submissions.filter(submission => (
          submission.roundNumber === round.roundNumber &&
          (String(submission.teamId || '') === String(team._id) || (team.participantIds || []).includes(submission.participantId))
        )).map(submission => ({
          participantId: submission.participantId,
          participantName: participantNames.get(submission.participantId) || '',
          status: submission.status,
          submittedAt: submission.submittedAt
        }));
        const project = (team.projectId && projects.find(item => String(item._id) === String(team.projectId))) ||
          projects.find(item => item.roundNumber === round.roundNumber &&
            (String(item.branchId || '') === String(team.branchId) ||
            (item.assignedBranchIds || []).some(branchId => String(branchId) === String(team.branchId))));
        return {
          branchName: branchMap.get(String(team.branchId)) || 'Unknown branch',
          teamCode: team.teamCode,
          participantIds: team.participantIds || [],
          memberNames: (team.participantIds || []).map(id => participantNames.get(id) || '')
            .map((name, index) => name || team.memberNames?.[index] || ''),
          projectName: project?.name || '',
          submissions: teamSubmissions,
          progressClaim: claim ? {
            claimedPercentage: claim.claimedPercentage,
            claimedErrorsSolved: claim.claimedErrorsSolved,
            status: claim.status,
            submittedAt: claim.submittedAt
          } : null,
          evaluation: evaluation ? {
            marks: evaluation.marks,
            maxMarks: evaluation.maxMarks,
            status: evaluation.status
          } : null,
          status: evaluation?.status || claim?.status || (teamSubmissions.length ? 'SUBMITTED' : 'NOT_STARTED')
        };
      });

      const statsByBranch = branches.map(branch => {
        const branchTeams = teams.filter(team => team.branchName === branch.name);
        const evaluated = branchTeams.filter(team => team.evaluation && team.evaluation.status !== 'PENDING');
        const qualified = evaluated.filter(team => team.evaluation.status === 'QUALIFIED').length;
        const averageMarks = evaluated.length
          ? evaluated.reduce((sum, team) => sum + Number(team.evaluation.marks || 0), 0) / evaluated.length
          : null;
        return {
          branchName: branch.name,
          teams: branchTeams.length,
          students: new Set(branchTeams.flatMap(team => team.participantIds)).size,
          submittedTeams: branchTeams.filter(team => team.submissions.length > 0 || team.progressClaim).length,
          evaluatedTeams: evaluated.length,
          qualifiedTeams: qualified,
          ...(permissions.branchAverages ? {
            averageMarks: averageMarks === null ? null : Number(averageMarks.toFixed(2)),
            averageScorePercent: averageMarks === null ? null : Number((evaluated.reduce(
              (sum, team) => sum + (Number(team.evaluation.maxMarks) > 0
                ? Number(team.evaluation.marks || 0) / Number(team.evaluation.maxMarks) * 100
                : 0), 0
            ) / evaluated.length).toFixed(2)),
            qualificationRate: evaluated.length ? Number((qualified / evaluated.length * 100).toFixed(2)) : null
          } : {})
        };
      });
      const highestBranch = permissions.branchAverages
        ? [...statsByBranch].filter(item => item.averageScorePercent !== null)
          .sort((left, right) => right.averageScorePercent - left.averageScorePercent)[0] || null
        : null;
      return {
        roundNumber: round.roundNumber,
        name: round.name,
        status: round.status,
        startAt: round.startAt,
        endAt: round.endAt,
        ...(permissions.roundProgress ? { teams } : {}),
        ...(permissions.branchStatistics ? { branchStatistics: statsByBranch } : {}),
        ...(permissions.branchAverages ? { highestBranch } : {})
      };
    });
    res.json({
      viewer: { name: viewer.name, username: viewer.username },
      permissions,
      branchScope: viewer.allBranches ? 'all' : 'selected',
      rounds: roundProgress
    });
  } catch (error) {
    console.error('Fetch Viewer Dashboard Error:', error);
    res.status(500).json({ message: 'Failed to fetch viewer dashboard' });
  }
});

module.exports = router;
