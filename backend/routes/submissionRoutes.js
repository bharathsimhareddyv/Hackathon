const express = require('express');
const router = express.Router();
const fs = require('fs');
const Submission = require('../models/Submission');
const RoundTeam = require('../models/RoundTeam');
const Round = require('../models/Round');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly, studentOnly } = require('../middleware/authMiddleware');
const { uploadSubmission } = require('../middleware/uploadMiddleware');
const { isCloudinaryConfigured, uploadToCloudinary } = require('../config/cloudinary');

// @route POST /api/student/submissions
// Student submits project work for current active round
router.post('/', protect, studentOnly, uploadSubmission.single('submissionZip'), async (req, res) => {
  try {
    const { roundNumber, githubUrl, commitSha, demoUrl, description } = req.body;
    const rNum = parseInt(roundNumber, 10);

    if (!rNum) return res.status(400).json({ message: 'Round number is required' });

    // Verify round is active
    const round = await Round.findOne({ roundNumber: rNum });
    if (!round) return res.status(404).json({ message: 'Round not found' });
    
    // Check timing or status
    const now = new Date();
    if (round.status === 'CLOSED' || (round.endAt && now > new Date(round.endAt))) {
      return res.status(400).json({ message: 'Submission window for this round is closed' });
    }

    // Check student team assignment in this round
    const team = await RoundTeam.findOne({
      roundNumber: rNum,
      participantIds: req.user.arohanId
    });

    if (!team) {
      return res.status(403).json({ message: `You are not assigned to any team for Round ${rNum}` });
    }

    let zipPath = '';
    let zipOriginalName = '';
    if (req.file) {
      zipOriginalName = req.file.originalname;

      if (!isCloudinaryConfigured()) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(503).json({ message: 'Configure Cloudinary before uploading submissions' });
      }
      const cResult = await uploadToCloudinary(req.file.buffer, zipOriginalName, 'aarohan_submissions');
      zipPath = cResult.secure_url;
    }

    const submission = new Submission({
      roundNumber: rNum,
      teamId: team._id,
      teamCode: team.teamCode,
      participantId: req.user.arohanId,
      githubUrl: githubUrl || '',
      commitSha: commitSha || '',
      zipPath,
      zipOriginalName,
      demoUrl: demoUrl || '',
      description: description || '',
      submittedAt: new Date()
    });

    await submission.save();

    await ActivityLog.create({
      actor: req.user.arohanId,
      action: 'SUBMISSION_CREATED',
      roundNumber: rNum,
      teamId: team.teamCode,
      details: `Submitted work for ${team.teamCode} in Round ${rNum} (${isCloudinaryConfigured() ? 'Cloudinary' : 'Local'})`
    });

    res.status(201).json({ message: 'Submission successful!', submission });
  } catch (error) {
    console.error('Student Submission Error:', error);
    res.status(500).json({ message: 'Failed to record submission: ' + error.message });
  }
});

// @route GET /api/student/submissions/my
router.get('/my', protect, studentOnly, async (req, res) => {
  try {
    const submissions = await Submission.find({ participantId: req.user.arohanId }).sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Fetch My Submissions Error:', error);
    res.status(500).json({ message: 'Failed to fetch submissions' });
  }
});

// @route GET /api/admin/submissions
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const { roundNumber, teamCode } = req.query;
    let filter = {};
    if (roundNumber) filter.roundNumber = parseInt(roundNumber, 10);
    if (teamCode) filter.teamCode = teamCode;

    const submissions = await Submission.find(filter).sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Fetch Admin Submissions Error:', error);
    res.status(500).json({ message: 'Failed to fetch submissions' });
  }
});

module.exports = router;
