const express = require('express');
const router = express.Router();
const Terms = require('../models/Terms');
const TermsAcceptance = require('../models/TermsAcceptance');
const Participant = require('../models/Participant');
const TeamAccount = require('../models/TeamAccount');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly, studentOnly } = require('../middleware/authMiddleware');

// @route GET /api/terms/current
router.get('/current', async (req, res) => {
  try {
    let currentTerms = await Terms.findOne({ isCurrent: true });
    if (!currentTerms) {
      // Create default terms if none exist
      currentTerms = new Terms({
        version: '1.0',
        content: `### AAROHAN PROGRAM HACKATHON — TERMS & CONDITIONS

1. **Schedule Compliance**: Students must participate strictly according to the assigned hackathon schedule.
2. **Project Workspace**: Students must use the assigned project/repository files provided by the AAROHAN platform.
3. **Local Development**: Work must be completed on participant machines. Submissions must be uploaded prior to round deadlines.
4. **Originality & Fair Play**: Plagiarism, unauthorized code sharing between teams, or tampering with evaluation metrics is strictly prohibited.
5. **Organizers Right**: AAROHAN organizers reserve the right to disqualify any participant or team failing to adhere to rules.
6. **Data Usage**: Progress, debug metrics, and submissions will be evaluated manually by assigned mentors and admins.`,
        isCurrent: true
      });
      await currentTerms.save();
    }

    res.json(currentTerms);
  } catch (error) {
    console.error('Fetch Terms Error:', error);
    res.status(500).json({ message: 'Failed to fetch terms' });
  }
});

// @route POST /api/terms/accept
router.post('/accept', protect, studentOnly, async (req, res) => {
  try {
    const { version } = req.body;
    const currentTerms = await Terms.findOne({ isCurrent: true });
    const versionToAccept = version || (currentTerms ? currentTerms.version : '1.0');

    const participant = await Participant.findById(req.user._id);
    if (!participant) return res.status(404).json({ message: 'Participant not found' });

    let acceptance = await TermsAcceptance.findOne({
      participantId: participant.arohanId,
      termsVersion: versionToAccept
    });

    if (!acceptance) {
      acceptance = new TermsAcceptance({
        participantId: participant.arohanId,
        termsVersion: versionToAccept,
        acceptedAt: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || ''
      });
      await acceptance.save();
    }

    participant.termsAccepted = true;
    participant.termsVersionAccepted = versionToAccept;
    if (participant.status === 'REGISTERED' || participant.status === 'TERMS_PENDING') {
      participant.status = 'READY';
    }
    await participant.save();

    await ActivityLog.create({
      actor: participant.arohanId,
      action: 'TERMS_ACCEPTED',
      participantId: participant.arohanId,
      details: `Accepted Terms & Conditions version ${versionToAccept}`
    });

    res.json({ message: 'Terms & Conditions accepted successfully', termsAccepted: true });
  } catch (error) {
    console.error('Accept Terms Error:', error);
    res.status(500).json({ message: 'Failed to accept terms' });
  }
});

// Admin-only: Update or publish new terms
router.post('/admin', protect, adminOnly, async (req, res) => {
  try {
    const { version, content } = req.body;
    if (!version || !content) {
      return res.status(400).json({ message: 'Version and content are required' });
    }

    // Set all previous terms isCurrent = false
    await Terms.updateMany({}, { isCurrent: false });

    const newTerms = new Terms({
      version,
      content,
      isCurrent: true,
      publishedAt: new Date()
    });

    await newTerms.save();

    // Reset termsAccepted flag for all participants so they re-accept new version!
    await Participant.updateMany({}, { termsAccepted: false });
    await TeamAccount.updateMany({}, { termsAccepted: false, termsVersionAccepted: null });

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'TERMS_UPDATED',
      details: `Published new Terms & Conditions version ${version}. Reset acceptance for participants.`
    });

    res.status(201).json(newTerms);
  } catch (error) {
    console.error('Update Terms Error:', error);
    res.status(500).json({ message: 'Failed to publish new terms' });
  }
});

module.exports = router;
