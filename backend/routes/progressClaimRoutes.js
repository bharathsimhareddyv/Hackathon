const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ProgressClaim = require('../models/ProgressClaim');
const RoundTeam = require('../models/RoundTeam');
const Round = require('../models/Round');
const TeamAccount = require('../models/TeamAccount');
const Evaluation = require('../models/Evaluation');
const Participant = require('../models/Participant');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly, teamOnly } = require('../middleware/authMiddleware');
const { uploadSubmission } = require('../middleware/uploadMiddleware');
const { isCloudinaryConfigured, uploadToCloudinary, createRawDownloadUrl } = require('../config/cloudinary');

// Team: submit progress claim (manual admin approval required)
router.post('/', protect, teamOnly, uploadSubmission.single('proofZip'), async (req, res) => {
  try {
    if (req.user.status === 'ELIMINATED' || req.user.status === 'DISQUALIFIED') {
      return res.status(403).json({ message: 'Your team has been eliminated or disqualified' });
    }

    const { roundNumber, claimedPercentage, claimedErrorsSolved, githubUrl, notes } = req.body;
    const rNum = parseInt(roundNumber, 10);
    const pct = String(claimedPercentage ?? '').trim() === '' ? null : Number(claimedPercentage);

    if (!rNum || (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100))) {
      return res.status(400).json({ message: 'Round number is required; completion percentage must be between 0 and 100 when provided' });
    }

    const round = await Round.findOne({ roundNumber: rNum });
    if (!round) return res.status(404).json({ message: 'Round not found' });

    const now = new Date();
    if (round.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Progress can only be submitted while the round status is ACTIVE' });
    }
    if (round.endAt && now > new Date(round.endAt)) {
      return res.status(400).json({ message: 'The submission deadline for this round has passed' });
    }

    const team = await RoundTeam.findOne({
      roundNumber: rNum,
      teamAccountId: req.user._id
    });

    if (!team) {
      return res.status(403).json({ message: `No team assignment for Round ${rNum}` });
    }

    const existingClaim = await ProgressClaim.findOne({ roundNumber: rNum, teamId: team._id });
    if (existingClaim) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(409).json({ message: `Your Round ${rNum} submission is already recorded and cannot be submitted again` });
    }

    const cleanGithubUrl = String(githubUrl || '').trim();
    const cleanNotes = String(notes || '').trim();
    if (!cleanGithubUrl && !req.file && !cleanNotes) {
      return res.status(400).json({ message: 'Provide a GitHub URL, ZIP file, or notes before submitting' });
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
      githubUrl: cleanGithubUrl,
      notes: cleanNotes,
      zipPath,
      zipOriginalName,
      status: 'PENDING'
    });

    await ActivityLog.create({
      actor: req.user.loginId,
      action: 'PROGRESS_CLAIM_SUBMITTED',
      roundNumber: rNum,
      teamId: team.teamCode,
      details: pct === null
        ? 'Submitted progress for review without a completion percentage'
        : `Claimed ${pct}% progress (pending approval)`
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

router.get('/admin/:id/download', async (req, res) => {
  try {
    const claim = await ProgressClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Submission not found' });
    if (!claim.zipPath) return res.status(404).json({ message: 'This submission has no ZIP file' });

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
    console.error('Download Progress Evidence Error:', error);
    res.status(502).json({ message: 'Could not create a download for this submission ZIP' });
  }
});

async function finalizeClaimReview(claim, req, status, marks, reason = '') {
  const round = await Round.findOne({ roundNumber: claim.roundNumber });
  if (!round) return { error: { status: 404, message: 'Round not found' } };

  const numericMarks = Number(marks);
  const maxMarks = Number(round.maxMarks);
  if (marks === undefined || marks === null || String(marks).trim() === '' ||
      !Number.isFinite(numericMarks) || !Number.isFinite(maxMarks) || maxMarks <= 0 || numericMarks < 0 || numericMarks > maxMarks) {
    return { error: { status: 400, message: `Enter marks between 0 and ${maxMarks}` } };
  }

  const team = await RoundTeam.findById(claim.teamId);
  if (!team) return { error: { status: 404, message: 'Team assignment not found' } };

  let evaluation = await Evaluation.findOne({ roundNumber: claim.roundNumber, teamId: team._id });
  if (!evaluation) {
    evaluation = new Evaluation({
      roundNumber: claim.roundNumber,
      teamId: team._id,
      teamCode: team.teamCode,
      participantIds: team.participantIds || []
    });
  }
  evaluation.marks = numericMarks;
  evaluation.maxMarks = maxMarks;
  evaluation.status = status;
  evaluation.remarks = reason || (status === 'QUALIFIED' ? 'Approved by admin' : 'Not approved by admin');
  evaluation.evaluatedBy = req.user.username || 'Admin';
  evaluation.evaluatedAt = new Date();
  await evaluation.save();

  const participantStatus = `ROUND${claim.roundNumber}_${status}`;
  const participantUpdate = { status: participantStatus };
  if (status === 'QUALIFIED') participantUpdate.currentRound = claim.roundNumber + 1;
  await Participant.updateMany(
    { arohanId: { $in: team.participantIds || [] }, currentRound: { $lte: claim.roundNumber } },
    { $set: participantUpdate }
  );

  claim.status = status === 'QUALIFIED' ? 'APPROVED' : 'REJECTED';
  claim.reviewedBy = req.user.username || 'Admin';
  claim.reviewedAt = new Date();
  claim.rejectionReason = status === 'NOT_QUALIFIED' ? reason : '';
  await claim.save();

  await ActivityLog.create({
    actor: req.user.username || 'Admin',
    action: status === 'QUALIFIED' ? 'PROGRESS_APPROVED' : 'PROGRESS_REJECTED',
    roundNumber: claim.roundNumber,
    teamId: claim.teamCode,
    oldValue: 'PENDING',
    newValue: status,
    details: `${status === 'QUALIFIED' ? 'Approved' : 'Rejected'} ${claim.teamCode}: ${numericMarks}/${maxMarks}${reason ? ` · ${reason}` : ''}`
  });

  return { claim, evaluation };
}

router.post('/admin/:id/approve', async (req, res) => {
  try {
    const claim = await ProgressClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'PENDING') {
      return res.status(400).json({ message: 'This submission has already been reviewed' });
    }

    const result = await finalizeClaimReview(claim, req, 'QUALIFIED', req.body.marks);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    res.json({ message: 'Submission approved and final marks recorded', ...result });
  } catch (error) {
    console.error('Approve Error:', error);
    res.status(500).json({ message: 'Failed to approve' });
  }
});

router.post('/admin/:id/reject', async (req, res) => {
  try {
    const { reason, marks } = req.body;
    const claim = await ProgressClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'PENDING') {
      return res.status(400).json({ message: 'This submission has already been reviewed' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: 'A rejection reason is required' });
    }

    const result = await finalizeClaimReview(claim, req, 'NOT_QUALIFIED', marks, String(reason).trim());
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    res.json({ message: 'Submission rejected and final marks recorded', ...result });
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
      const manualQualification = await Evaluation.findOne({
        roundNumber: rNum,
        teamId: team._id,
        status: 'QUALIFIED'
      });
      if (!approved && !manualQualification) {
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
        } else if (ev.status === 'PENDING') {
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
