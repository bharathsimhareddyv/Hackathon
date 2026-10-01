const express = require('express');
const router = express.Router();
const Evaluation = require('../models/Evaluation');
const RoundTeam = require('../models/RoundTeam');
const Participant = require('../models/Participant');
const ActivityLog = require('../models/ActivityLog');
const Round = require('../models/Round');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly);

// @route GET /api/admin/evaluations/round/:roundNumber
router.get('/round/:roundNumber', async (req, res) => {
  try {
    const roundNum = parseInt(req.params.roundNumber, 10);
    const evaluations = await Evaluation.find({ roundNumber: roundNum })
      .populate('teamId')
      .sort({ createdAt: -1 });

    res.json(evaluations);
  } catch (error) {
    console.error('Fetch Evaluations Error:', error);
    res.status(500).json({ message: 'Failed to fetch evaluations' });
  }
});

// @route POST /api/admin/evaluations
// Save or update evaluation for a team in a round
router.post('/', async (req, res) => {
  try {
    const {
      roundNumber,
      teamId,
      totalErrors,
      errorsSolved,
      htmlSolved,
      cssSolved,
      jsSolved,
      reactSolved,
      tasksCompleted,
      maxTasks,
      codeQuality,
      functionality,
      uiUx,
      innovation,
      presentation,
      marks,
      maxMarks,
      remarks,
      status
    } = req.body;

    if (!roundNumber || !teamId) {
      return res.status(400).json({ message: 'Round number and Team ID are required' });
    }

    if (marks === undefined || marks === null || String(marks).trim() === '' || maxMarks === undefined || maxMarks === null || String(maxMarks).trim() === '') {
      return res.status(400).json({ message: 'Enter awarded marks and maximum marks to save an evaluation' });
    }
    const numericMarks = Number(marks);
    const numericMaxMarks = Number(maxMarks);
    if (!Number.isFinite(numericMarks) || !Number.isFinite(numericMaxMarks) || numericMaxMarks <= 0 || numericMarks < 0 || numericMarks > numericMaxMarks) {
      return res.status(400).json({ message: 'Marks must be between 0 and the maximum marks' });
    }
    const round = await Round.findOne({ roundNumber: parseInt(roundNumber, 10) });
    if (!round) return res.status(404).json({ message: 'Round not found' });
    if (numericMaxMarks !== Number(round.maxMarks)) {
      return res.status(400).json({ message: `Maximum marks for Round ${round.roundNumber} is ${round.maxMarks}` });
    }

    const team = await RoundTeam.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    let evaluation = await Evaluation.findOne({
      roundNumber: parseInt(roundNumber, 10),
      teamId: team._id
    });

    const isNew = !evaluation;
    const oldStatus = evaluation ? evaluation.status : 'NONE';

    if (isNew) {
      evaluation = new Evaluation({
        roundNumber: parseInt(roundNumber, 10),
        teamId: team._id,
        teamCode: team.teamCode,
        participantIds: team.participantIds
      });
    }

    // Update evaluation data
    evaluation.totalErrors = totalErrors !== undefined ? parseInt(totalErrors, 10) : evaluation.totalErrors;
    evaluation.errorsSolved = errorsSolved !== undefined ? parseInt(errorsSolved, 10) : evaluation.errorsSolved;
    evaluation.htmlSolved = htmlSolved !== undefined ? parseInt(htmlSolved, 10) : evaluation.htmlSolved;
    evaluation.cssSolved = cssSolved !== undefined ? parseInt(cssSolved, 10) : evaluation.cssSolved;
    evaluation.jsSolved = jsSolved !== undefined ? parseInt(jsSolved, 10) : evaluation.jsSolved;
    evaluation.reactSolved = reactSolved !== undefined ? parseInt(reactSolved, 10) : evaluation.reactSolved;

    evaluation.tasksCompleted = tasksCompleted !== undefined ? parseInt(tasksCompleted, 10) : evaluation.tasksCompleted;
    evaluation.maxTasks = maxTasks !== undefined ? parseInt(maxTasks, 10) : evaluation.maxTasks;
    evaluation.codeQuality = codeQuality !== undefined ? parseInt(codeQuality, 10) : evaluation.codeQuality;
    evaluation.functionality = functionality !== undefined ? parseInt(functionality, 10) : evaluation.functionality;
    evaluation.uiUx = uiUx !== undefined ? parseInt(uiUx, 10) : evaluation.uiUx;
    evaluation.innovation = innovation !== undefined ? parseInt(innovation, 10) : evaluation.innovation;
    evaluation.presentation = presentation !== undefined ? parseInt(presentation, 10) : evaluation.presentation;

    evaluation.marks = marks !== undefined ? parseFloat(marks) : evaluation.marks;
    evaluation.maxMarks = round.maxMarks;
    evaluation.remarks = remarks !== undefined ? remarks : evaluation.remarks;
    if (status) evaluation.status = status;

    evaluation.evaluatedBy = req.user.username || 'Admin';
    evaluation.evaluatedAt = new Date();

    await evaluation.save();

    // Sync status to team participants
    const rNum = parseInt(roundNumber, 10);
    const qualifiedStatusStr = `ROUND${rNum}_QUALIFIED`;
    const notQualifiedStatusStr = `ROUND${rNum}_NOT_QUALIFIED`;

    for (const pid of team.participantIds) {
      const participant = await Participant.findOne({ arohanId: pid });
      if (participant) {
        if (evaluation.status === 'QUALIFIED') {
          participant.status = qualifiedStatusStr;
          if (participant.currentRound < rNum + 1) {
            participant.currentRound = rNum + 1; // Unlock next round
          }
        } else if (evaluation.status === 'NOT_QUALIFIED') {
          participant.status = notQualifiedStatusStr;
        } else if (evaluation.status === 'DISQUALIFIED') {
          participant.status = 'DISQUALIFIED';
        }
        await participant.save();
      }
    }

    // Activity log
    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'EVALUATION_SAVED',
      roundNumber: rNum,
      teamId: team.teamCode,
      oldValue: oldStatus,
      newValue: evaluation.status,
      details: `Evaluated ${team.teamCode}: Marks ${evaluation.marks}/${evaluation.maxMarks}, Status: ${evaluation.status}`
    });

    res.json(evaluation);
  } catch (error) {
    console.error('Save Evaluation Error:', error);
    res.status(500).json({ message: 'Failed to save evaluation' });
  }
});

// @route POST /api/admin/evaluations/:id/override-status
// Manual override of team qualification status
router.post('/:id/override-status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['QUALIFIED', 'NOT_QUALIFIED', 'PENDING', 'DISQUALIFIED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const evaluation = await Evaluation.findById(req.params.id);
    if (!evaluation) return res.status(404).json({ message: 'Evaluation not found' });

    const oldStatus = evaluation.status;
    evaluation.status = status;
    await evaluation.save();

    // Sync to participants
    const rNum = evaluation.roundNumber;
    const qualifiedStatusStr = `ROUND${rNum}_QUALIFIED`;
    const notQualifiedStatusStr = `ROUND${rNum}_NOT_QUALIFIED`;

    for (const pid of evaluation.participantIds) {
      const participant = await Participant.findOne({ arohanId: pid });
      if (participant) {
        if (status === 'QUALIFIED') {
          participant.status = qualifiedStatusStr;
          if (participant.currentRound < rNum + 1) {
            participant.currentRound = rNum + 1;
          }
        } else if (status === 'NOT_QUALIFIED') {
          participant.status = notQualifiedStatusStr;
        } else if (status === 'DISQUALIFIED') {
          participant.status = 'DISQUALIFIED';
        }
        await participant.save();
      }
    }

    await ActivityLog.create({
      actor: req.user.username || 'Admin',
      action: 'STATUS_OVERRIDE',
      roundNumber: rNum,
      teamId: evaluation.teamCode,
      oldValue: oldStatus,
      newValue: status,
      details: `Admin manually changed status for ${evaluation.teamCode} from ${oldStatus} to ${status}`
    });

    res.json({ message: `Status updated to ${status}`, evaluation });
  } catch (error) {
    console.error('Override Status Error:', error);
    res.status(500).json({ message: 'Failed to override status' });
  }
});

module.exports = router;
