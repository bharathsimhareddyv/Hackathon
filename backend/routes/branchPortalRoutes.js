const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const TeamAccount = require('../models/TeamAccount');
const RoundTeam = require('../models/RoundTeam');
const Round = require('../models/Round');
const Participant = require('../models/Participant');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const ProgressClaim = require('../models/ProgressClaim');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const { createRawDownloadUrl } = require('../config/cloudinary');
const { protect, branchOnly } = require('../middleware/authMiddleware');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const { sequentialTeamLoginIds } = require('../utils/teamLoginId');
const { roundsVisibleToBranch } = require('../utils/roundVisibility');

const router = express.Router();
router.use(protect, branchOnly);

router.get('/rounds', async (req, res) => {
  try {
    const rounds = await Round.find(roundsVisibleToBranch(req.user._id)).sort({ roundNumber: 1 });
    res.json(rounds);
  } catch (error) {
    console.error('Fetch Branch Rounds Error:', error);
    res.status(500).json({ message: 'Failed to fetch rounds' });
  }
});

router.post('/rounds', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const type = req.body.type || 'APPLICATION';
    const startAt = req.body.startAt ? new Date(req.body.startAt) : new Date();
    const endAt = req.body.endAt ? new Date(req.body.endAt) : new Date(startAt.getTime() + 2 * 60 * 60 * 1000);
    const maxMarks = Number(req.body.maxMarks ?? 100);
    const requiredMinPercentage = Number(req.body.requiredMinPercentage ?? 60);
    const allowedTypes = ['DEBUGGING', 'REACT_GITHUB', 'APPLICATION'];

    if (!name || name.length > 150 || !allowedTypes.includes(type)) {
      return res.status(400).json({ message: 'A round name and valid challenge type are required' });
    }
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
      return res.status(400).json({ message: 'Round end time must be later than its start time' });
    }
    if (!Number.isFinite(maxMarks) || maxMarks <= 0 || !Number.isFinite(requiredMinPercentage) ||
        requiredMinPercentage < 0 || requiredMinPercentage > 100) {
      return res.status(400).json({ message: 'Maximum marks must be greater than zero' });
    }

    const latest = await Round.findOne().sort({ roundNumber: -1 }).select('roundNumber');
    const roundNumber = (latest?.roundNumber || 0) + 1;
    const round = await Round.create({
      roundNumber,
      branchId: req.user._id,
      name,
      type,
      description: String(req.body.description || ''),
      instructions: String(req.body.instructions || ''),
      startAt,
      endAt,
      maxMarks,
      requiredMinPercentage,
      criteriaSummary: String(req.body.criteriaSummary || ''),
      qualificationCriteria: {
        minErrorsSolved: Number(req.body.minErrorsSolved || 0),
        minPercentage: requiredMinPercentage,
        minMarks: Number(req.body.minMarks ?? 60),
        ruleType: 'OR'
      }
    });
    await ActivityLog.create({
      actor: req.user.username,
      action: 'BRANCH_ROUND_CREATED',
      roundNumber,
      details: `Branch ${req.user.name} created Round ${roundNumber}: ${name}`
    });
    res.status(201).json(round);
  } catch (error) {
    console.error('Create Branch Round Error:', error);
    res.status(500).json({ message: 'Failed to create branch round' });
  }
});

router.put('/rounds/:id', async (req, res) => {
  try {
    const round = await Round.findOne({ _id: req.params.id, branchId: req.user._id });
    if (!round) return res.status(404).json({ message: 'Branch round not found' });

    const name = req.body.name === undefined ? round.name : String(req.body.name).trim();
    const startAt = req.body.startAt === undefined ? round.startAt : new Date(req.body.startAt);
    const endAt = req.body.endAt === undefined ? round.endAt : new Date(req.body.endAt);
    const maxMarks = req.body.maxMarks === undefined ? round.maxMarks : Number(req.body.maxMarks);
    if (!name || name.length > 150 || !Number.isFinite(new Date(startAt).getTime()) ||
        !Number.isFinite(new Date(endAt).getTime()) || new Date(endAt) <= new Date(startAt)) {
      return res.status(400).json({ message: 'Enter a round name and an end time later than its start time' });
    }
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      return res.status(400).json({ message: 'Maximum marks must be greater than zero' });
    }

    for (const field of ['name', 'description', 'instructions', 'criteriaSummary', 'githubRepoUrl', 'requiredMinPercentage']) {
      if (req.body[field] !== undefined) round[field] = req.body[field];
    }
    round.startAt = startAt;
    round.endAt = endAt;
    round.maxMarks = maxMarks;
    if (req.body.requiredMinPercentage !== undefined) {
      round.qualificationCriteria.minPercentage = Number(req.body.requiredMinPercentage);
    }
    await round.save();
    res.json(round);
  } catch (error) {
    console.error('Update Branch Round Error:', error);
    res.status(500).json({ message: 'Failed to update branch round' });
  }
});

router.post('/rounds/:id/status', async (req, res) => {
  try {
    const round = await Round.findOne({ _id: req.params.id, branchId: req.user._id });
    if (!round) return res.status(404).json({ message: 'Branch round not found' });
    const { status } = req.body;
    if (!['SCHEDULED', 'ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ message: 'Choose a valid round status' });
    }
    const now = new Date();
    const previousDuration = new Date(round.endAt) - new Date(round.startAt);
    round.status = status;
    round.active = status === 'ACTIVE';
    if (status === 'ACTIVE') {
      round.startAt = now;
      if (new Date(round.endAt) <= now) {
        round.endAt = new Date(now.getTime() + (previousDuration > 0 ? previousDuration : 2 * 60 * 60 * 1000));
      }
    }
    if (status === 'CLOSED') round.endAt = now;
    await round.save();
    await ActivityLog.create({
      actor: req.user.username,
      action: 'BRANCH_ROUND_STATUS_CHANGED',
      roundNumber: round.roundNumber,
      details: `Branch ${req.user.name} changed Round ${round.roundNumber} to ${status}`
    });
    res.json({ message: `Round ${round.roundNumber} is ${status}`, round });
  } catch (error) {
    console.error('Change Branch Round Status Error:', error);
    res.status(500).json({ message: 'Failed to change branch round status' });
  }
});

router.post('/students/generate', async (req, res) => {
  try {
    const { startId, endId } = req.body;
    const startMatch = String(startId || '').trim().toUpperCase().match(/^([A-Z]+)(\d{1,9})$/);
    const endMatch = String(endId || '').trim().toUpperCase().match(/^([A-Z]+)(\d{1,9})$/);
    if (!startMatch || !endMatch || startMatch[1] !== endMatch[1]) {
      return res.status(400).json({ message: 'Use matching student ID prefixes, such as AIF260001 to AIF260020' });
    }
    const start = Number(startMatch[2]);
    const end = Number(endMatch[2]);
    if (start > end || end - start > 499) {
      return res.status(400).json({ message: 'Student ID range must be ordered and contain no more than 500 IDs' });
    }
    const ids = Array.from({ length: end - start + 1 }, (_, index) => (
      `${startMatch[1]}${String(start + index).padStart(startMatch[2].length, '0')}`
    ));
    const existing = await Participant.find({ arohanId: { $in: ids } }).select('arohanId');
    if (existing.length) {
      return res.status(409).json({ message: `These student IDs already exist: ${existing.map(item => item.arohanId).join(', ')}` });
    }

    const salt = await bcrypt.genSalt(10);
    const created = [];
    for (const arohanId of ids) {
      const temporaryPassword = generateRandomPassword();
      await Participant.create({
        arohanId,
        branchId: req.user._id,
        passwordHash: await bcrypt.hash(temporaryPassword, salt),
        temporaryPasswordPlain: temporaryPassword,
        forcePasswordChange: true,
        status: 'REGISTERED'
      });
      created.push({ arohanId, temporaryPassword });
    }

    await ActivityLog.create({
      actor: req.user.username,
      action: 'BRANCH_STUDENTS_GENERATED',
      details: `Branch ${req.user.name} generated ${created.length} student IDs: ${ids[0]} to ${ids[ids.length - 1]}`
    });
    res.status(201).json({ message: `Generated ${created.length} student IDs`, students: created });
  } catch (error) {
    console.error('Generate Branch Students Error:', error);
    res.status(500).json({ message: 'Failed to generate branch student IDs' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const students = await Participant.find({ branchId: req.user._id })
      .select('arohanId name college email active status currentRound temporaryPasswordPlain createdAt')
      .sort({ arohanId: 1 });
    const assignments = await RoundTeam.find({
      branchId: req.user._id,
      participantIds: { $in: students.map(student => student.arohanId) }
    }).select('participantIds memberNames');
    const assignedNames = new Map();
    assignments.forEach(assignment => {
      assignment.participantIds.forEach((id, index) => {
        if (assignment.memberNames[index]) assignedNames.set(id, assignment.memberNames[index]);
      });
    });
    res.json(students.map(student => ({
      ...student.toObject(),
      name: student.name || assignedNames.get(student.arohanId) || null
    })));
  } catch (error) {
    console.error('Fetch Branch Students Error:', error);
    res.status(500).json({ message: 'Failed to fetch branch students' });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid student account ID' });
    }
    const student = await Participant.findOne({ _id: req.params.id, branchId: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student account not found in this branch' });

    for (const field of ['name', 'college', 'email']) {
      if (req.body[field] !== undefined) student[field] = String(req.body[field]).trim() || null;
    }
    if (req.body.active !== undefined) student.active = Boolean(req.body.active);
    await student.save();

    if (req.body.name !== undefined) {
      const assignments = await RoundTeam.find({
        branchId: req.user._id,
        participantIds: student.arohanId
      });
      for (const assignment of assignments) {
        const index = assignment.participantIds.indexOf(student.arohanId);
        if (index >= 0) {
          assignment.memberNames[index] = student.name || student.arohanId;
          await assignment.save();
          if (assignment.teamAccountId) {
            await TeamAccount.updateOne(
              { _id: assignment.teamAccountId, branchId: req.user._id },
              { $set: { memberNames: assignment.memberNames } }
            );
          }
        }
      }
    }
    await ActivityLog.create({
      actor: req.user.username || req.user.name || 'Branch',
      action: 'BRANCH_STUDENT_UPDATED',
      participantId: student.arohanId,
      details: `Updated branch student ${student.arohanId}`
    });
    res.json({
      message: `Updated ${student.arohanId}`,
      student: {
        _id: student._id,
        arohanId: student.arohanId,
        name: student.name,
        college: student.college,
        email: student.email,
        active: student.active,
        status: student.status
      }
    });
  } catch (error) {
    console.error('Update Branch Student Error:', error);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: error.name === 'ValidationError' ? error.message : 'Failed to update student'
    });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid student account ID' });
    }
    const student = await Participant.findOne({ _id: req.params.id, branchId: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student account not found in this branch' });
    student.active = false;
    await student.save();
    await ActivityLog.create({
      actor: req.user.username || req.user.name || 'Branch',
      action: 'BRANCH_STUDENT_DISABLED',
      participantId: student.arohanId,
      details: `Disabled login for branch student ${student.arohanId}; submission history retained`
    });
    res.json({ message: `Disabled login for ${student.arohanId}; existing submissions and reports are retained` });
  } catch (error) {
    console.error('Disable Branch Student Error:', error);
    res.status(500).json({ message: 'Failed to disable student login' });
  }
});

router.post('/students/:id/reset-password', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid student account ID' });
    }
    const student = await Participant.findOne({ _id: req.params.id, branchId: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student account not found in this branch' });
    const temporaryPassword = generateRandomPassword();
    student.passwordHash = await bcrypt.hash(temporaryPassword, 10);
    student.temporaryPasswordPlain = temporaryPassword;
    student.forcePasswordChange = true;
    await student.save();
    await ActivityLog.create({
      actor: req.user.username || req.user.name || 'Branch',
      action: 'BRANCH_STUDENT_PASSWORD_RESET',
      participantId: student.arohanId,
      details: `Reset password for branch student ${student.arohanId}`
    });
    res.json({ message: `Password reset for ${student.arohanId}`, loginId: student.arohanId, temporaryPassword });
  } catch (error) {
    console.error('Reset Branch Student Password Error:', error);
    res.status(500).json({ message: 'Failed to reset student password' });
  }
});

router.get('/team-accounts', async (req, res) => {
  try {
    const teams = await TeamAccount.find({ branchId: req.user._id })
      .select('loginId currentRound status memberNames temporaryPasswordPlain createdAt')
      .sort({ createdAt: -1 });
    res.json(teams);
  } catch (error) {
    console.error('Fetch Branch Team Accounts Error:', error);
    res.status(500).json({ message: 'Failed to fetch this branch’s team accounts' });
  }
});

router.put('/team-accounts/:id', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid team account ID' });
    }
    const account = await TeamAccount.findOne({ _id: req.params.id, branchId: req.user._id });
    if (!account) return res.status(404).json({ message: 'Team account not found in this branch' });

    let nextLoginId = account.loginId;
    if (req.body.loginId !== undefined) {
      nextLoginId = String(req.body.loginId).trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(nextLoginId)) {
        return res.status(400).json({ message: 'Team ID must be 2-40 characters using letters, numbers, hyphens, or underscores' });
      }
      if (await TeamAccount.exists({ loginId: nextLoginId, _id: { $ne: account._id } })) {
        return res.status(409).json({ message: 'That team ID is already in use' });
      }
    }
    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'BLOCKED'].includes(req.body.status)) {
        return res.status(400).json({ message: 'Branch owners can set a team login to ACTIVE or BLOCKED' });
      }
      account.status = req.body.status;
    }

    const previousLoginId = account.loginId;
    account.loginId = nextLoginId;
    await account.save();
    if (previousLoginId !== nextLoginId) {
      await Promise.all([
        RoundTeam.updateMany({ teamAccountId: account._id }, { $set: { teamCode: nextLoginId } }),
        ProgressClaim.updateMany({ teamAccountId: account._id }, { $set: { teamCode: nextLoginId } }),
        Evaluation.updateMany({ teamCode: previousLoginId }, { $set: { teamCode: nextLoginId } }),
        Submission.updateMany({ teamCode: previousLoginId }, { $set: { teamCode: nextLoginId } })
      ]);
    }
    await ActivityLog.create({
      actor: req.user.username || req.user.name || 'Branch',
      action: 'BRANCH_TEAM_UPDATED',
      teamId: nextLoginId,
      details: `Updated branch team ${previousLoginId}${previousLoginId !== nextLoginId ? ` to ${nextLoginId}` : ''}`
    });
    res.json({
      message: `Updated ${nextLoginId}`,
      team: {
        _id: account._id,
        loginId: account.loginId,
        status: account.status,
        memberNames: account.memberNames
      }
    });
  } catch (error) {
    console.error('Update Branch Team Error:', error);
    if (error.code === 11000) return res.status(409).json({ message: 'That team ID is already in use' });
    res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: error.name === 'ValidationError' ? error.message : 'Failed to update team account'
    });
  }
});

router.delete('/team-accounts/:id', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid team account ID' });
    }
    const account = await TeamAccount.findOne({ _id: req.params.id, branchId: req.user._id });
    if (!account) return res.status(404).json({ message: 'Team account not found in this branch' });
    account.status = 'BLOCKED';
    await account.save();
    await ActivityLog.create({
      actor: req.user.username || req.user.name || 'Branch',
      action: 'BRANCH_TEAM_DISABLED',
      teamId: account.loginId,
      details: `Disabled login for branch team ${account.loginId}; reports and submissions retained`
    });
    res.json({ message: `Disabled ${account.loginId}; reports and submissions are retained` });
  } catch (error) {
    console.error('Disable Branch Team Error:', error);
    res.status(500).json({ message: 'Failed to disable team login' });
  }
});

router.post('/team-accounts/:id/reset-password', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid team account ID' });
    }
    const account = await TeamAccount.findOne({ _id: req.params.id, branchId: req.user._id });
    if (!account) return res.status(404).json({ message: 'Team account not found in this branch' });
    const temporaryPassword = generateRandomPassword();
    account.passwordHash = await bcrypt.hash(temporaryPassword, 10);
    account.temporaryPasswordPlain = temporaryPassword;
    await account.save();
    await ActivityLog.create({
      actor: req.user.username || req.user.name || 'Branch',
      action: 'BRANCH_TEAM_PASSWORD_RESET',
      teamId: account.loginId,
      details: `Reset password for branch team ${account.loginId}`
    });
    res.json({ message: `Password reset for ${account.loginId}`, loginId: account.loginId, temporaryPassword });
  } catch (error) {
    console.error('Reset Branch Team Password Error:', error);
    res.status(500).json({ message: 'Failed to reset team password' });
  }
});

router.get('/assignments', async (req, res) => {
  try {
    const teams = await TeamAccount.find({ branchId: req.user._id }).select('_id');
    const assignments = await RoundTeam.find({
      $or: [{ branchId: req.user._id }, { teamAccountId: { $in: teams.map(team => team._id) } }]
    }).populate('teamAccountId', 'loginId status')
      .populate('projectId', 'name githubUrl filePath originalFileName')
      .sort({ roundNumber: 1, teamCode: 1 });
    res.json(assignments);
  } catch (error) {
    console.error('Fetch Branch Assignments Error:', error);
    res.status(500).json({ message: 'Failed to fetch branch team assignments' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const roundFilter = req.query.roundNumber;
    if (roundFilter && roundFilter !== 'all' && (!Number.isInteger(Number(roundFilter)) || Number(roundFilter) < 1)) {
      return res.status(400).json({ message: 'Choose a valid round number' });
    }
    const teamAccounts = await TeamAccount.find({ branchId: req.user._id }).distinct('_id');
    const teams = await RoundTeam.find({
      $or: [{ branchId: req.user._id }, { teamAccountId: { $in: teamAccounts } }]
    }).select('_id teamCode teamAccountId participantIds memberNames roundNumber');
    const teamById = new Map(teams.map(team => [String(team._id), team]));
    const evaluationQuery = { teamId: { $in: teams.map(team => team._id) } };
    if (roundFilter && roundFilter !== 'all') evaluationQuery.roundNumber = Number(roundFilter);
    const [evaluations, rounds, participants] = await Promise.all([
      Evaluation.find(evaluationQuery).sort({ roundNumber: 1 }),
      Round.find(roundsVisibleToBranch(req.user._id)).select('roundNumber name maxMarks').sort({ roundNumber: 1 }),
      Participant.find({ branchId: req.user._id }).select('arohanId name')
    ]);
    const studentNames = new Map(participants.filter(student => student.name).map(student => [student.arohanId, student.name]));
    const assignedNames = new Map();
    teams.forEach(team => team.participantIds.forEach((id, index) => {
      if (!assignedNames.has(id) && team.memberNames[index]) assignedNames.set(id, team.memberNames[index]);
    }));
    const ranked = new Map();
    evaluations.forEach(evaluation => {
      const team = teamById.get(String(evaluation.teamId));
      if (!team) return;
      const key = String(team.teamAccountId || team.teamCode);
      if (!ranked.has(key)) {
        ranked.set(key, {
          teamCode: evaluation.teamCode || team.teamCode,
          participants: [],
          memberNameById: {},
          roundScores: {},
          totalMarks: 0,
          totalMaxMarks: 0,
          finalStatus: evaluation.status,
          latestRound: 0
        });
      }
      const item = ranked.get(key);
      (team.participantIds || evaluation.participantIds || []).forEach((id, index) => {
        if (!item.participants.includes(id)) item.participants.push(id);
        item.memberNameById[id] = studentNames.get(id) || team.memberNames?.[index] || assignedNames.get(id) || null;
      });
      item.roundScores[evaluation.roundNumber] = {
        marks: evaluation.marks,
        maxMarks: evaluation.maxMarks,
        status: evaluation.status
      };
      item.totalMarks += Number(evaluation.marks) || 0;
      item.totalMaxMarks += Number(evaluation.maxMarks) || 0;
      if (evaluation.roundNumber >= item.latestRound) {
        item.latestRound = evaluation.roundNumber;
        item.finalStatus = evaluation.status;
      }
    });
    const leaderboard = [...ranked.values()]
      .sort((a, b) => b.totalMarks - a.totalMarks)
      .map((item, index) => {
        const { memberNameById, ...rankedItem } = item;
        return {
          rank: index + 1,
          ...rankedItem,
          members: item.participants.map(id => ({
            arohanId: id,
            name: studentNames.get(id) || memberNameById[id] || null
          }))
        };
      });
    res.json({
      rounds,
      leaderboard
    });
  } catch (error) {
    console.error('Fetch Branch Leaderboard Error:', error);
    res.status(500).json({ message: 'Failed to fetch branch leaderboard' });
  }
});

router.post('/team-accounts/:id/assign-students', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid team account ID' });
    }
    const account = await TeamAccount.findOne({ _id: req.params.id, branchId: req.user._id });
    if (!account) return res.status(404).json({ message: 'Team account not found in this branch' });
    if (account.status !== 'ACTIVE') return res.status(400).json({ message: 'Only active teams can receive students' });

    const roundNumber = Number(req.body.roundNumber);
    const memberLimit = Number(req.body.memberLimit);
    const participantIds = [...new Set((Array.isArray(req.body.participantIds) ? req.body.participantIds : [])
      .map(id => String(id).trim().toUpperCase()).filter(Boolean))];
    if (!Number.isInteger(roundNumber) || roundNumber < 1 || participantIds.length < 1 ||
        !Number.isInteger(memberLimit) || memberLimit < 1 || memberLimit > 20 || participantIds.length > memberLimit) {
      return res.status(400).json({ message: 'Choose a round and students within the team size limit (1-20)' });
    }
    const round = await Round.findOne({
      roundNumber,
      ...roundsVisibleToBranch(req.user._id)
    });
    if (!round) return res.status(404).json({ message: 'This round does not belong to your branch' });

    const students = await Participant.find({
      arohanId: { $in: participantIds },
      branchId: req.user._id,
      active: true
    }).select('arohanId name');
    if (students.length !== participantIds.length) {
      const found = new Set(students.map(student => student.arohanId));
      const missing = participantIds.filter(id => !found.has(id));
      return res.status(400).json({ message: `Unknown, inactive, or other-branch student IDs: ${missing.join(', ')}` });
    }
    const studentsById = new Map(students.map(student => [student.arohanId, student]));
    const orderedStudents = participantIds.map(id => studentsById.get(id));

    let assignment = await RoundTeam.findOne({ roundNumber, teamAccountId: account._id });
    const conflicts = await RoundTeam.find({
      roundNumber,
      participantIds: { $in: participantIds },
      ...(assignment ? { _id: { $ne: assignment._id } } : {})
    }).select('teamCode');
    if (conflicts.length) {
      return res.status(409).json({
        message: `One or more students are already assigned to: ${conflicts.map(team => team.teamCode).join(', ')}`
      });
    }

    const studentNames = Array.isArray(req.body.studentNames)
      ? req.body.studentNames.map(name => String(name).trim())
      : [];
    if (studentNames.length !== participantIds.length ||
      studentNames.some(name => !name || name.length > 100)) {
      return res.status(400).json({ message: 'Enter one valid student name for each selected student ID' });
    }
    const projectId = req.body.projectId || null;
    if (projectId && !/^[a-f\d]{24}$/i.test(String(projectId))) {
      return res.status(400).json({ message: 'Invalid project selected' });
    }
    if (projectId && !await Project.exists({
      _id: projectId,
      roundNumber,
      $or: [
        { branchId: req.user._id },
        { assignedBranchIds: req.user._id }
      ]
    })) {
      return res.status(400).json({ message: 'Choose a project available for this round' });
    }
    if (!assignment) {
      assignment = new RoundTeam({
        roundNumber,
        branchId: req.user._id,
        teamCode: account.loginId,
        teamAccountId: account._id
      });
    }
    assignment.branchId = req.user._id;
    assignment.participantIds = participantIds;
    assignment.memberLimit = memberLimit;
    assignment.memberNames = orderedStudents.map((student, index) => (
      studentNames[index] || student.name || student.arohanId
    ));
    assignment.projectId = projectId;
    await assignment.save();
    account.memberNames = assignment.memberNames;
    await account.save();
    await Participant.updateMany(
      { _id: { $in: orderedStudents.map(student => student._id) } },
      { $set: { currentRound: roundNumber } }
    );
    if (studentNames.length) {
      await Promise.all(orderedStudents.map((student, index) => Participant.updateOne(
        { _id: student._id },
        { $set: { name: studentNames[index] } }
      )));
    }
    await ActivityLog.create({
      actor: req.user.username,
      action: 'BRANCH_TEAM_STUDENTS_ASSIGNED',
      roundNumber,
      teamId: account.loginId,
      details: `Branch ${req.user.name} assigned students: ${participantIds.join(', ')}`
    });
    await assignment.populate(['teamAccountId', 'projectId']);
    res.json({ message: `Assigned ${participantIds.length} student(s) to ${account.loginId}`, team: assignment });
  } catch (error) {
    console.error('Assign Branch Students Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'This team is already assigned for the selected round. Refresh the page and try again.' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to assign students to team' });
  }
});

router.get('/submissions', async (req, res) => {
  try {
    const participantIds = await Participant.find({ branchId: req.user._id }).distinct('arohanId');
    const submissions = await Submission.find({
      $or: [
        { branchId: req.user._id },
        { participantId: { $in: participantIds } }
      ]
    }).populate('teamId', 'teamCode teamAccountId')
      .sort({ submittedAt: -1 });
    const ids = [...new Set(submissions.map(submission => submission.participantId))];
    const [students, assignments, evaluations] = await Promise.all([
      Participant.find({ arohanId: { $in: ids } }).select('arohanId name'),
      RoundTeam.find({ branchId: req.user._id, participantIds: { $in: ids } })
        .select('roundNumber participantIds memberNames'),
      Evaluation.find({
        participantIds: { $in: ids },
        teamId: { $in: submissions.map(submission => submission.teamId).filter(Boolean) }
      }).select('roundNumber teamId marks maxMarks status')
    ]);
    const namesById = new Map(students.filter(student => student.name).map(student => [student.arohanId, student.name]));
    assignments.forEach(assignment => assignment.participantIds.forEach((id, index) => {
      if (!namesById.has(id) && assignment.memberNames[index]) namesById.set(id, assignment.memberNames[index]);
    }));
    const evaluationsByTeamRound = new Map(evaluations.map(evaluation => [
      `${evaluation.teamId}:${evaluation.roundNumber}`,
      evaluation
    ]));
    res.json(submissions.map(submission => ({
      ...submission.toObject(),
      studentName: namesById.get(submission.participantId) || null,
      evaluation: evaluationsByTeamRound.get(`${submission.teamId?._id || submission.teamId}:${submission.roundNumber}`) || null
    })));
  } catch (error) {
    console.error('Fetch Branch Student Submissions Error:', error);
    res.status(500).json({ message: 'Failed to fetch branch submissions' });
  }
});

router.get('/submissions/:id/download', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid submission ID' });
    }
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const belongsToBranch = submission.branchId
      ? String(submission.branchId) === String(req.user._id)
      : await Participant.exists({ arohanId: submission.participantId, branchId: req.user._id });
    if (!belongsToBranch) return res.status(403).json({ message: 'This submission is not available to your branch' });
    if (!submission.zipPath) return res.status(404).json({ message: 'This submission has no ZIP archive' });

    const fileName = path.basename(submission.zipOriginalName || `${submission.teamCode}-round-${submission.roundNumber}.zip`);
    if (/^https?:\/\//i.test(submission.zipPath)) {
      return res.json({ downloadUrl: createRawDownloadUrl(submission.zipPath), fileName });
    }

    const submissionsDirectory = path.resolve(__dirname, '..', 'uploads', 'submissions');
    const localPath = path.resolve(submission.zipPath);
    if (!localPath.startsWith(`${submissionsDirectory}${path.sep}`) || !fs.existsSync(localPath)) {
      return res.status(404).json({ message: 'Submission ZIP was not found on the server' });
    }
    return res.download(localPath, fileName);
  } catch (error) {
    console.error('Download Branch Student Submission Error:', error);
    res.status(502).json({ message: 'Could not create a download for this submission ZIP' });
  }
});

router.post('/submissions/:id/review', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid submission ID' });
    }
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const isBranchSubmission = submission.branchId
      ? String(submission.branchId) === String(req.user._id)
      : await Participant.exists({ arohanId: submission.participantId, branchId: req.user._id });
    if (!isBranchSubmission) return res.status(403).json({ message: 'This submission is not available to your branch' });
    if (submission.status === 'EVALUATED') {
      return res.status(409).json({ message: 'This submission has already been approved. Only an admin can edit its marks or qualification.' });
    }

    const team = await RoundTeam.findOne({
      _id: submission.teamId,
      roundNumber: submission.roundNumber,
      $or: [{ branchId: req.user._id }, { participantIds: submission.participantId }]
    });
    if (!team) return res.status(403).json({ message: 'The team is not assigned to your branch' });

    const round = await Round.findOne({
      roundNumber: submission.roundNumber,
      ...roundsVisibleToBranch(req.user._id)
    });
    if (!round) return res.status(404).json({ message: 'Round is not available to your branch' });

    let marks = null;
    if (req.body.marks !== undefined && req.body.marks !== null && String(req.body.marks).trim() !== '') {
      marks = Number(req.body.marks);
      if (!Number.isFinite(marks) || marks < 0 || marks > round.maxMarks) {
        return res.status(400).json({ message: `Marks must be between 0 and ${round.maxMarks}` });
      }
    }

    let evaluation = await Evaluation.findOne({ roundNumber: round.roundNumber, teamId: team._id });
    if (evaluation && evaluation.status !== 'PENDING') {
      return res.status(409).json({ message: 'This team already has a final evaluation. Only an admin can edit marks or qualification.' });
    }
    if (!evaluation) {
      evaluation = new Evaluation({
        roundNumber: round.roundNumber,
        teamId: team._id,
        teamCode: team.teamCode,
        participantIds: team.participantIds
      });
    }
    if (marks !== null) evaluation.marks = marks;
    evaluation.maxMarks = round.maxMarks;
    evaluation.status = 'QUALIFIED';
    evaluation.evaluatedBy = req.user.username || req.user.name || 'Branch';
    evaluation.evaluatedAt = new Date();
    await evaluation.save();

    submission.status = 'EVALUATED';
    await submission.save();
    await Participant.updateMany(
      { arohanId: { $in: team.participantIds }, currentRound: { $lte: round.roundNumber } },
      { $set: { status: `ROUND${round.roundNumber}_QUALIFIED`, currentRound: round.roundNumber + 1 } }
    );
    await ActivityLog.create({
      actor: req.user.username || req.user.name || 'Branch',
      action: 'BRANCH_SUBMISSION_APPROVED',
      roundNumber: round.roundNumber,
      teamId: team.teamCode,
      newValue: 'QUALIFIED',
      details: `Approved submission for ${team.teamCode}${marks === null ? ' without marks' : ` with marks ${marks}/${round.maxMarks}`}`
    });
    res.json({ message: `Approved ${team.teamCode}; team qualified for the next round`, evaluation });
  } catch (error) {
    console.error('Review Branch Student Submission Error:', error);
    res.status(500).json({ message: 'Failed to approve submission' });
  }
});

router.get('/progress-claims', async (req, res) => {
  try {
    const teams = await TeamAccount.find({ branchId: req.user._id }).distinct('_id');
    const claims = await ProgressClaim.find({ teamAccountId: { $in: teams } })
      .populate('teamId', 'teamCode participantIds memberNames')
      .populate('teamAccountId', 'loginId')
      .sort({ submittedAt: -1 });
    res.json(claims);
  } catch (error) {
    console.error('Fetch Branch Team Submissions Error:', error);
    res.status(500).json({ message: 'Failed to fetch branch team submissions' });
  }
});

router.get('/progress-claims/:id/download', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid progress submission ID' });
    }
    const teams = await TeamAccount.find({ branchId: req.user._id }).distinct('_id');
    const claim = await ProgressClaim.findOne({
      _id: req.params.id,
      teamAccountId: { $in: teams }
    });
    if (!claim) return res.status(404).json({ message: 'Team submission not found in this branch' });
    if (!claim.zipPath) return res.status(404).json({ message: 'This submission has no ZIP archive' });

    const fileName = path.basename(claim.zipOriginalName || `${claim.teamCode}-round-${claim.roundNumber}.zip`);
    if (/^https?:\/\//i.test(claim.zipPath)) {
      return res.json({ downloadUrl: createRawDownloadUrl(claim.zipPath), fileName });
    }
    const submissionsDirectory = path.resolve(__dirname, '..', 'uploads', 'submissions');
    const localPath = path.resolve(claim.zipPath);
    if (!localPath.startsWith(`${submissionsDirectory}${path.sep}`) || !fs.existsSync(localPath)) {
      return res.status(404).json({ message: 'Submission ZIP was not found on the server' });
    }
    return res.download(localPath, fileName);
  } catch (error) {
    console.error('Download Branch Team Submission Error:', error);
    res.status(502).json({ message: 'Could not create a download for this team ZIP' });
  }
});

router.post('/progress-claims/:id/review', async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid progress submission ID' });
    }
    const teams = await TeamAccount.find({ branchId: req.user._id }).distinct('_id');
    const claim = await ProgressClaim.findOne({
      _id: req.params.id,
      teamAccountId: { $in: teams }
    });
    if (!claim) return res.status(404).json({ message: 'Team submission not found in this branch' });
    if (claim.status !== 'PENDING') {
      return res.status(400).json({ message: 'This team submission has already been reviewed' });
    }

    const round = await Round.findOne({
      roundNumber: claim.roundNumber,
      ...roundsVisibleToBranch(req.user._id)
    });
    if (!round) return res.status(404).json({ message: 'Round is not available to your branch' });
    let marks = null;
    if (req.body.marks !== undefined && req.body.marks !== null && String(req.body.marks).trim() !== '') {
      marks = Number(req.body.marks);
      if (!Number.isFinite(marks) || marks < 0 || marks > round.maxMarks) {
        return res.status(400).json({ message: `Marks must be between 0 and ${round.maxMarks}` });
      }
    }
    const team = await RoundTeam.findOne({
      _id: claim.teamId,
      roundNumber: claim.roundNumber,
      $or: [{ branchId: req.user._id }, { teamAccountId: { $in: teams } }]
    });
    if (!team) return res.status(403).json({ message: 'The team is not assigned to your branch' });

    let evaluation = await Evaluation.findOne({ roundNumber: round.roundNumber, teamId: team._id });
    if (evaluation && evaluation.status !== 'PENDING') {
      return res.status(409).json({ message: 'This team already has a final evaluation. Only an admin can edit marks or qualification.' });
    }
    if (!evaluation) {
      evaluation = new Evaluation({
        roundNumber: round.roundNumber,
        teamId: team._id,
        teamCode: team.teamCode,
        participantIds: team.participantIds
      });
    }
    if (marks !== null) evaluation.marks = marks;
    evaluation.maxMarks = round.maxMarks;
    evaluation.status = 'QUALIFIED';
    evaluation.remarks = marks === null ? 'Approved by branch without marks' : 'Approved by branch';
    evaluation.evaluatedBy = req.user.username || req.user.name || 'Branch';
    evaluation.evaluatedAt = new Date();
    await evaluation.save();

    const reviewedBy = req.user.username || req.user.name || 'Branch';
    claim.status = 'APPROVED';
    claim.reviewedBy = reviewedBy;
    claim.reviewedAt = new Date();
    claim.rejectionReason = '';
    await claim.save();
    await Participant.updateMany(
      { arohanId: { $in: team.participantIds || [] }, currentRound: { $lte: round.roundNumber } },
      { $set: { status: `ROUND${round.roundNumber}_QUALIFIED`, currentRound: round.roundNumber + 1 } }
    );
    await ActivityLog.create({
      actor: reviewedBy,
      action: 'BRANCH_PROGRESS_APPROVED',
      roundNumber: round.roundNumber,
      teamId: team.teamCode,
      oldValue: 'PENDING',
      newValue: 'QUALIFIED',
      details: `Branch approved ${team.teamCode}${marks === null ? ' without marks' : ` with marks ${marks}/${round.maxMarks}`}`
    });
    res.json({ message: `Approved ${team.teamCode}; team qualified for the next round`, evaluation, claim });
  } catch (error) {
    console.error('Review Branch Team Submission Error:', error);
    res.status(500).json({ message: 'Failed to approve team submission' });
  }
});

router.get('/projects', async (req, res) => {
  try {
    const rounds = await Round.find(roundsVisibleToBranch(req.user._id)).distinct('roundNumber');
    const projects = await Project.find({
      roundNumber: { $in: rounds },
      $or: [{ branchId: req.user._id }, { assignedBranchIds: req.user._id }]
    }).sort({ roundNumber: 1, name: 1 });
    res.json(projects);
  } catch (error) {
    console.error('Fetch Branch Projects Error:', error);
    res.status(500).json({ message: 'Failed to fetch branch projects' });
  }
});

router.post('/team-accounts/bulk-generate', async (req, res) => {
  try {
    const roundNumber = Number(req.body.roundNumber);
    const count = Number(req.body.count);
    if (!Number.isInteger(roundNumber) || roundNumber < 1) {
      return res.status(400).json({ message: 'A valid round number is required' });
    }

    let loginIds;
    try {
      loginIds = sequentialTeamLoginIds(req.body.teamName, req.body.startingNumber, count);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const existingAccounts = await TeamAccount.find({ loginId: { $in: loginIds } }).select('loginId');
    if (existingAccounts.length) {
      return res.status(409).json({
        message: `These team IDs already exist: ${existingAccounts.map(account => account.loginId).join(', ')}`
      });
    }

    const round = await Round.findOne({
      roundNumber,
      ...roundsVisibleToBranch(req.user._id)
    }).select('_id');
    if (!round) return res.status(404).json({ message: `Round ${roundNumber} does not belong to your branch` });

    const teams = [];
    for (const loginId of loginIds) {
      const password = generateRandomPassword();
      const account = await TeamAccount.create({
        loginId,
        passwordHash: await bcrypt.hash(password, 10),
        temporaryPasswordPlain: password,
        branchId: req.user._id,
        currentRound: roundNumber,
        status: 'ACTIVE'
      });

      await RoundTeam.create({
        roundNumber,
        teamCode: loginId,
        teamAccountId: account._id,
        branchId: req.user._id,
        memberNames: [],
        participantIds: []
      });

      teams.push({ loginId, password });
    }

    await ActivityLog.create({
      actor: req.user.username,
      action: 'BRANCH_TEAMS_GENERATED',
      roundNumber,
      details: `Generated ${teams.length} team accounts for branch ${req.user.name}: ${loginIds.join(', ')}`
    });

    res.status(201).json({ message: `Created ${teams.length} teams`, teams });
  } catch (error) {
    console.error('Generate Branch Teams Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'One or more generated team IDs already exist. Choose another starting number.' });
    }
    res.status(500).json({ message: 'Failed to generate branch teams' });
  }
});

module.exports = router;
