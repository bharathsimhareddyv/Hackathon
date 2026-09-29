const express = require('express');
const router = express.Router();
const fs = require('fs');
const ProgressClaim = require('../models/ProgressClaim');
const RoundTeam = require('../models/RoundTeam');
const Round = require('../models/Round');
const TeamAccount = require('../models/TeamAccount');
const Evaluation = require('../models/Evaluation');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly, teamOnly } = require('../middleware/authMiddleware');
const { uploadSubmission } = require('../middleware/uploadMiddleware');
const { isCloudinaryConfigured, uploadToCloudinary } = require('../config/cloudinary');

// Team: submit progress claim (manual admin approval required)
router.post('/', protect, teamOnly, uploadSubmission.single('proofZip'), async (req, res) => {
  try {
    if (req.user.status === 'ELIMINATED' || req.user.status === 'DISQUALIFIED') {
      return res.status(403).json({ message: 'Your team has been eliminated or disqualified' });
    }

    const { roundNumber, claimedPercentage, claimedErrorsSolved, githubUrl, notes } = req.body;
    const rNum = parseInt(roundNumber, 10);
    const pct = parseFloat(claimedPercentage);

    if (!rNum || Number.isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ message: 'Valid roundNumber and claimedPercentage (0-100) required' });
    }

    const round = await Round.findOne({ roundNumber: rNum });
    if (!round) return res.status(404).json({ message: 'Round not found' });

    const now = new Date();
    if (round.status !== 'ACTIVE' || (round.startAt && now < new Date(round.startAt)) || (round.endAt && now > new Date(round.endAt))) {
      return res.status(400).json({ message: 'Progress can only be submitted while the round is active' });
    }

    const team = await RoundTeam.findOne({
      roundNumber: rNum,
      teamAccountId: req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: `No team assignment for Round ${rNum}` });
    }

    let zipPath = '';
    let zipOriginalName = '';
    if (req.file) {
      zipOriginalName = req.file.originalname;
      if (!isCloudinaryConfigured()) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(503).json({ message: 'Configure Cloudinary before uploading progress evidence' });
      }
      const cResult = await uploadToCloudinary(req.file.buffer, zipOriginalName, 'aarohan_progress_proofs');
      zipPath = cResult.secure_url;
    }

    const claim = await ProgressClaim.create({
      roundNumber: rNum,
      teamId: team._id,
      teamAccountId: req.user._id,
      teamCode: team.teamCode,
      claimedPercentage: pct,
      claimedErrorsSolved: parseInt(claimedErrorsSolved, 10) || 0,
      githubUrl: githubUrl || '',
      notes: notes || '',
      zipPath,
      zipOriginalName,
      status: 'PENDING'
    });

    await ActivityLog.create({
      actor: req.user.loginId,
      action: 'PROGRESS_CLAIM_SUBMITTED',
      roundNumber: rNum,
      teamId: team.teamCode,
      details: `Claimed ${pct}% progress (pending approval)`
    });

    res.status(201).json({ message: 'Progress submitted — awaiting admin approval', claim });
  } catch (error) {
    console.error('Progress Claim Error:', error);
    res.status(500).json({ message: 'Failed to submit progress claim' });
  }
});

router.get('/my', protect, teamOnly, async (req, res) => {
  try {
    const claims = await ProgressClaim.find({ teamAccountId: req.user._id }).sort({ submittedAt: -1 });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch claims' });
  }
});

router.use(protect, adminOnly);

// Admin list with search
router.get('/admin', async (req, res) => {
  try {
    const { roundNumber, status, search, minPercentage } = req.query;
    const filter = {};
    if (roundNumber) filter.roundNumber = parseInt(roundNumber, 10);
    if (status) filter.status = status;
    if (minPercentage) filter.claimedPercentage = { $gte: parseFloat(minPercentage) };
    if (search) {
      filter.$or = [
        { teamCode: new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') }
      ];
    }

    const claims = await ProgressClaim.find(filter).sort({ submittedAt: -1 });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch progress claims' });
  }
});

router.post('/admin/:id/approve', async (req, res) => {
  try {
    const claim = await ProgressClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status === 'APPROVED') {
      return res.status(400).json({ message: 'Already approved' });
    }

    const round = await Round.findOne({ roundNumber: claim.roundNumber });
    const requiredPercentage = round?.qualificationCriteria?.minPercentage ?? round?.requiredMinPercentage ?? 0;
    if (claim.claimedPercentage < requiredPercentage) {
      return res.status(400).json({ message: `Claim is below the round requirement of ${requiredPercentage}%` });
    }

    claim.status = 'APPROVED';
    claim.reviewedBy = req.user.username || 'Admin';
    claim.reviewedAt = new Date();
    claim.rejectionReason = '';
    await claim.save();

    const team = await RoundTeam.findById(claim.teamId);
    let evaluation = await Evaluation.findOne({ roundNumber: claim.roundNumber, teamId: claim.teamId });
    if (!evaluation && team) {
      evaluation = new Evaluation({
        roundNumber: claim.roundNumber,
        teamId: team._id,
        teamCode: team.teamCode,
        participantIds: team.participantIds || [],
        marks: 0,
        maxMarks: round?.maxMarks || 100
      });
    }
    if (evaluation) {
      const totalErrors = evaluation.totalErrors || 200;
      evaluation.errorsSolved = claim.claimedErrorsSolved || Math.round((claim.claimedPercentage / 100) * totalErrors);
      evaluation.marks = Math.round((claim.claimedPercentage / 100) * (round?.maxMarks || evaluation.maxMarks || 100));
      evaluation.maxMarks = round?.maxMarks || evaluation.maxMarks || 100;
      evaluation.remarks = `Approved progress: ${claim.claimedPercentage}%`;
      evaluation.evaluatedBy = req.user.username || 'Admin';
      evaluation.evaluatedAt = new Date();
      await evaluation.save();
    }

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'PROGRESS_APPROVED',
      roundNumber: claim.roundNumber,
      teamId: claim.teamCode,
      details: `Approved ${claim.claimedPercentage}% for ${claim.teamCode}`
    });

    res.json({ message: 'Progress approved', claim, evaluation });
  } catch (error) {
    console.error('Approve Error:', error);
    res.status(500).json({ message: 'Failed to approve' });
  }
});

router.post('/admin/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const claim = await ProgressClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    claim.status = 'REJECTED';
    claim.reviewedBy = req.user.username || 'Admin';
    claim.reviewedAt = new Date();
    claim.rejectionReason = reason || 'Rejected by admin';
    await claim.save();

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'PROGRESS_REJECTED',
      roundNumber: claim.roundNumber,
      teamId: claim.teamCode,
      details: claim.rejectionReason
    });

    res.json({ message: 'Progress rejected', claim });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject' });
  }
});

// Close round: eliminate teams with no approved claim before deadline
router.post('/admin/close-round/:roundNumber', async (req, res) => {
  try {
    const rNum = parseInt(req.params.roundNumber, 10);
    const round = await Round.findOne({ roundNumber: rNum });
    if (!round) return res.status(404).json({ message: 'Round not found' });

    const teams = await RoundTeam.find({ roundNumber: rNum });
    let eliminated = 0;

    for (const team of teams) {
      if (!team.teamAccountId) continue;
      const approved = await ProgressClaim.findOne({
        roundNumber: rNum,
        teamId: team._id,
        status: 'APPROVED'
      });
      if (!approved) {
        await TeamAccount.findByIdAndUpdate(team.teamAccountId, {
          status: 'ELIMINATED',
          eliminatedAtRound: rNum
        });
        let ev = await Evaluation.findOne({ roundNumber: rNum, teamId: team._id });
        if (!ev) {
          ev = new Evaluation({
            roundNumber: rNum,
            teamId: team._id,
            teamCode: team.teamCode,
            participantIds: team.participantIds || [],
            marks: 0,
            maxMarks: round.maxMarks || 100,
            status: 'DISQUALIFIED'
          });
        } else {
          ev.status = 'DISQUALIFIED';
        }
        await ev.save();
        eliminated += 1;
      }
    }

    round.status = 'CLOSED';
    round.active = false;
    await round.save();

    res.json({ message: `Round ${rNum} closed. ${eliminated} team(s) eliminated (no approved progress).` });
  } catch (error) {
    console.error('Close Round Error:', error);
    res.status(500).json({ message: 'Failed to close round' });
  }
});

module.exports = router;
