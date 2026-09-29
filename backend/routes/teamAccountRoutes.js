const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const RoundTeam = require('../models/RoundTeam');
const TeamAccount = require('../models/TeamAccount');
const Participant = require('../models/Participant');
const ProgressClaim = require('../models/ProgressClaim');
const Evaluation = require('../models/Evaluation');
const Submission = require('../models/Submission');
const Round = require('../models/Round');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly, teamOnly } = require('../middleware/authMiddleware');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const { nextAarohanTeamLoginId } = require('../utils/teamLoginId');
const { isEmailConfigured, sendMail, welcomeHackathonHtml, qualifiedNextRoundHtml, eliminatedHtml } = require('../utils/emailService');
const Settings = require('../models/Settings');

router.get('/assignments', protect, teamOnly, async (req, res) => {
  try {
    const assignments = await RoundTeam.find({ teamAccountId: req.user._id })
      .populate('projectId')
      .sort({ roundNumber: 1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch team assignments' });
  }
});

router.use(protect, adminOnly);

// GET all team accounts
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { loginId: new RegExp(search, 'i') },
        { memberNames: new RegExp(search, 'i') }
      ];
    }
    const teams = await TeamAccount.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    res.json(teams);
  } catch (error) {
    console.error('Fetch Team Accounts Error:', error);
    res.status(500).json({ message: 'Failed to fetch team accounts' });
  }
});

router.get('/round/:roundNumber', async (req, res) => {
  try {
    const roundNumber = parseInt(req.params.roundNumber, 10);
    if (!Number.isInteger(roundNumber) || roundNumber < 1) {
      return res.status(400).json({ message: 'A valid round number is required' });
    }
    const teams = await RoundTeam.find({ roundNumber, teamAccountId: { $ne: null } })
      .populate('teamAccountId', 'loginId status memberNames')
      .populate('projectId')
      .sort({ teamCode: 1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch round team accounts' });
  }
});

// POST create one team + round assignment
router.post('/create', async (req, res) => {
  try {
    const {
      roundNumber,
      memberNames = [],
      contactEmails = [],
      projectId,
      customLoginId,
      password: customPassword
    } = req.body;

    if (!roundNumber) {
      return res.status(400).json({ message: 'roundNumber is required' });
    }

    const loginId = (customLoginId || await nextAarohanTeamLoginId(roundNumber)).toLowerCase().trim();
    const existing = await TeamAccount.findOne({ loginId });
    if (existing) {
      return res.status(400).json({ message: `Login ID ${loginId} already exists` });
    }

    const plainPassword = customPassword || generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    const account = await TeamAccount.create({
      loginId,
      passwordHash,
      temporaryPasswordPlain: plainPassword,
      memberNames: Array.isArray(memberNames) ? memberNames : String(memberNames).split(',').map(s => s.trim()).filter(Boolean),
      contactEmails: Array.isArray(contactEmails) ? contactEmails : String(contactEmails).split(',').map(s => s.trim()).filter(Boolean),
      currentRound: parseInt(roundNumber, 10),
      status: 'ACTIVE'
    });

    const teamCode = loginId;
    const roundTeam = await RoundTeam.create({
      roundNumber: parseInt(roundNumber, 10),
      teamCode,
      teamAccountId: account._id,
      memberNames: account.memberNames,
      participantIds: [],
      projectId: projectId || null
    });

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'TEAM_ACCOUNT_CREATED',
      roundNumber: parseInt(roundNumber, 10),
      teamId: teamCode,
      details: `Created ${loginId} with ${account.memberNames.length} members`
    });

    res.status(201).json({
      account: {
        _id: account._id,
        loginId: account.loginId,
        memberNames: account.memberNames,
        contactEmails: account.contactEmails,
        currentRound: account.currentRound,
        status: account.status
      },
      roundTeam,
      temporaryPassword: plainPassword
    });
  } catch (error) {
    console.error('Create Team Account Error:', error);
    res.status(500).json({ message: 'Failed to create team account' });
  }
});

// POST bulk generate teams for a round
router.post('/bulk-generate', async (req, res) => {
  try {
    const { count = 1, roundNumber, projectId, memberNamesPerTeam = [] } = req.body;
    const n = Math.min(Math.max(parseInt(count, 10) || 1, 1), 200);
    const rNum = parseInt(roundNumber, 10);
    if (!rNum) return res.status(400).json({ message: 'roundNumber is required' });

    const created = [];
    for (let i = 0; i < n; i++) {
      const loginId = await nextAarohanTeamLoginId(rNum);
      const plainPassword = generateRandomPassword();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(plainPassword, salt);

      const names = Array.isArray(memberNamesPerTeam[i])
        ? memberNamesPerTeam[i]
        : (memberNamesPerTeam[i] ? [memberNamesPerTeam[i]] : []);

      const account = await TeamAccount.create({
        loginId,
        passwordHash,
        temporaryPasswordPlain: plainPassword,
        memberNames: names,
        contactEmails: [],
        currentRound: rNum,
        status: 'ACTIVE'
      });

      await RoundTeam.create({
        roundNumber: rNum,
        teamCode: loginId,
        teamAccountId: account._id,
        memberNames: names,
        participantIds: [],
        projectId: projectId || null
      });

      created.push({ loginId, password: plainPassword, memberNames: names });
    }

    res.status(201).json({ message: `Created ${created.length} teams`, teams: created });
  } catch (error) {
    console.error('Bulk Generate Teams Error:', error);
    res.status(500).json({ message: 'Failed to bulk generate teams' });
  }
});

router.post('/:id/assign-participants', async (req, res) => {
  try {
    const { roundNumber, participantIds, memberLimit, projectId } = req.body;
    const roundNum = parseInt(roundNumber, 10);
    const capacity = parseInt(memberLimit, 10);
    const cleanIds = [...new Set((Array.isArray(participantIds) ? participantIds : [])
      .map(id => String(id).trim().toUpperCase()).filter(Boolean))];

    if (!Number.isInteger(roundNum) || roundNum < 1 || cleanIds.length === 0) {
      return res.status(400).json({ message: 'Choose a round and at least one Arohan ID' });
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20 || cleanIds.length > capacity) {
      return res.status(400).json({ message: 'Selected students must fit within the team size (1-20)' });
    }

    const account = await TeamAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ message: 'Team account not found' });
    if (account.status !== 'ACTIVE') return res.status(400).json({ message: 'Only active team accounts can receive participants' });
    if (!await Round.exists({ roundNumber: roundNum })) {
      return res.status(404).json({ message: `Round ${roundNum} does not exist` });
    }

    const participants = await Participant.find({ arohanId: { $in: cleanIds }, active: true }).select('arohanId name');
    if (participants.length !== cleanIds.length) {
      const found = new Set(participants.map(participant => participant.arohanId));
      const missing = cleanIds.filter(id => !found.has(id));
      return res.status(400).json({ message: `Unknown or inactive Arohan IDs: ${missing.join(', ')}` });
    }

    let roundTeam = await RoundTeam.findOne({ roundNumber: roundNum, teamAccountId: account._id });
    const conflictsFilter = {
      roundNumber: roundNum,
      participantIds: { $in: cleanIds },
      ...(roundTeam ? { _id: { $ne: roundTeam._id } } : {})
    };
    const conflicts = await RoundTeam.find(conflictsFilter).select('teamCode participantIds');
    if (conflicts.length) {
      const conflictingTeams = conflicts.map(team => team.teamCode).join(', ');
      return res.status(409).json({ message: `One or more students are already assigned in Round ${roundNum} (${conflictingTeams})` });
    }

    if (!roundTeam) {
      roundTeam = new RoundTeam({ roundNumber: roundNum, teamCode: account.loginId, teamAccountId: account._id });
    }
    roundTeam.participantIds = cleanIds;
    roundTeam.memberLimit = capacity;
    roundTeam.memberNames = participants.map(participant => participant.name || participant.arohanId);
    if (projectId !== undefined) roundTeam.projectId = projectId || null;
    await roundTeam.save();

    account.memberNames = roundTeam.memberNames;
    await account.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'TEAM_PARTICIPANTS_ASSIGNED',
      roundNumber: roundNum,
      teamId: account.loginId,
      details: `Assigned ${cleanIds.length}/${capacity} students: ${cleanIds.join(', ')}`
    });

    await roundTeam.populate(['teamAccountId', 'projectId']);
    res.json({ message: `Assigned ${cleanIds.length} student(s) to ${account.loginId}`, team: roundTeam });
  } catch (error) {
    console.error('Assign Team Participants Error:', error);
    res.status(500).json({ message: 'Failed to assign students to team' });
  }
});

// POST reset password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const account = await TeamAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ message: 'Team not found' });

    const plainPassword = generateRandomPassword();
    const salt = await bcrypt.genSalt(10);
    account.passwordHash = await bcrypt.hash(plainPassword, salt);
    account.temporaryPasswordPlain = plainPassword;
    await account.save();

    res.json({ message: 'Password reset', loginId: account.loginId, temporaryPassword: plainPassword });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// PUT update team account
router.put('/:id', async (req, res) => {
  try {
    const account = await TeamAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ message: 'Team not found' });

    const { memberNames, contactEmails, status, currentRound } = req.body;
    if (memberNames !== undefined) account.memberNames = memberNames;
    if (contactEmails !== undefined) account.contactEmails = contactEmails;
    if (status !== undefined) account.status = status;
    if (currentRound !== undefined) account.currentRound = currentRound;
    await account.save();

    res.json(account);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update team' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const account = await TeamAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ message: 'Team not found' });

    const roundTeams = await RoundTeam.find({ teamAccountId: account._id }).select('_id roundNumber');
    const roundTeamIds = roundTeams.map(team => team._id);
    await Promise.all([
      ProgressClaim.deleteMany({ teamAccountId: account._id }),
      Evaluation.deleteMany({ teamId: { $in: roundTeamIds } }),
      Submission.deleteMany({ teamId: { $in: roundTeamIds } }),
      RoundTeam.deleteMany({ teamAccountId: account._id })
    ]);
    await TeamAccount.findByIdAndDelete(account._id);
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'TEAM_ACCOUNT_DELETED',
      teamId: account.loginId,
      details: `Deleted ${account.loginId} and ${roundTeamIds.length} round assignment(s)`
    });
    res.json({ message: `${account.loginId} and its round data were deleted` });
  } catch (error) {
    console.error('Delete Team Account Error:', error);
    res.status(500).json({ message: 'Failed to delete team account' });
  }
});

// POST bulk welcome emails
router.post('/send-welcome', async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Configure SMTP_USER and SMTP_PASS before sending welcome emails' });
    }
    const { teamAccountIds, sendToAll } = req.body;
    let accounts = [];
    if (sendToAll) {
      accounts = await TeamAccount.find({ status: 'ACTIVE' });
    } else if (teamAccountIds?.length) {
      accounts = await TeamAccount.find({ _id: { $in: teamAccountIds } });
    } else {
      return res.status(400).json({ message: 'Provide teamAccountIds or sendToAll' });
    }

    const settings = await Settings.findOne() || {};
    let sent = 0;
    for (const acc of accounts) {
      const emails = acc.contactEmails.filter(Boolean);
      if (emails.length === 0) continue;
      const pwd = acc.temporaryPasswordPlain || '(use admin reset to view)';
      await sendMail({
        to: emails,
        subject: `Welcome to ${settings.hackathonName || 'AAROHAN Hackathon'}`,
        html: welcomeHackathonHtml({
          teamCode: acc.loginId,
          loginId: acc.loginId,
          password: pwd,
          hackathonName: settings.hackathonName
        })
      });
      acc.welcomeEmailSentAt = new Date();
      await acc.save();
      sent += 1;
    }

    res.json({ message: `Welcome emails processed for ${sent} team(s)` });
  } catch (error) {
    console.error('Send Welcome Error:', error);
    res.status(500).json({ message: 'Failed to send welcome emails' });
  }
});

// POST bulk qualified / eliminated emails
router.post('/send-bulk-status', async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Configure SMTP_USER and SMTP_PASS before sending status emails' });
    }
    const { teamAccountIds, type, roundNumber, nextRound } = req.body;
    if (!type || !['qualified', 'eliminated'].includes(type)) {
      return res.status(400).json({ message: 'type must be qualified or eliminated' });
    }

    const accounts = await TeamAccount.find({ _id: { $in: teamAccountIds || [] } });
    const settings = await Settings.findOne() || {};
    let sent = 0;

    for (const acc of accounts) {
      const emails = acc.contactEmails.filter(Boolean);
      if (!emails.length) continue;
      const html = type === 'qualified'
        ? qualifiedNextRoundHtml({ teamCode: acc.loginId, nextRound: nextRound || acc.currentRound + 1, hackathonName: settings.hackathonName })
        : eliminatedHtml({ teamCode: acc.loginId, roundNumber: roundNumber || acc.currentRound });

      await sendMail({
        to: emails,
        subject: type === 'qualified' ? 'Approved for next round — AAROHAN' : 'Round update — AAROHAN',
        html
      });
      sent += 1;
    }

    res.json({ message: `Sent ${sent} email(s)` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send bulk emails' });
  }
});

module.exports = router;
