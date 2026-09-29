const express = require('express');
const router = express.Router();
const Participant = require('../models/Participant');
const Evaluation = require('../models/Evaluation');
const Submission = require('../models/Submission');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly);

// Helper to convert array of objects to CSV string
function convertToCSV(data, headers) {
  if (!data || data.length === 0) return headers.join(',') + '\n';
  
  const headerLine = headers.join(',') + '\n';
  const rows = data.map(item => {
    return headers.map(h => {
      let val = item[h] !== undefined && item[h] !== null ? String(item[h]) : '';
      // Escape quotes and commas
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  }).join('\n');

  return headerLine + rows;
}

// @route GET /api/admin/export/participants
router.get('/participants', async (req, res) => {
  try {
    const participants = await Participant.find().sort({ arohanId: 1 });
    const data = participants.map(p => ({
      ArohanID: p.arohanId,
      Status: p.status,
      CurrentRound: p.currentRound,
      TermsAccepted: p.termsAccepted ? 'YES' : 'NO',
      Active: p.active ? 'ACTIVE' : 'INACTIVE',
      TemporaryPassword: p.temporaryPasswordPlain || '***HIDDEN***',
      CreatedAt: p.createdAt ? p.createdAt.toISOString() : ''
    }));

    const csv = convertToCSV(data, ['ArohanID', 'Status', 'CurrentRound', 'TermsAccepted', 'Active', 'TemporaryPassword', 'CreatedAt']);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aarohan_participants.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export Participants Error:', error);
    res.status(500).json({ message: 'Failed to export participants' });
  }
});

// @route GET /api/admin/export/evaluations/:roundNumber
router.get('/evaluations/:roundNumber', async (req, res) => {
  try {
    const roundNum = parseInt(req.params.roundNumber, 10);
    const evaluations = await Evaluation.find({ roundNumber: roundNum }).sort({ marks: -1 });

    const data = evaluations.map(e => ({
      Round: e.roundNumber,
      TeamCode: e.teamCode,
      Participants: e.participantIds ? e.participantIds.join(' | ') : '',
      ErrorsSolved: e.errorsSolved,
      TotalErrors: e.totalErrors,
      HTMLSolved: e.htmlSolved,
      CSSSolved: e.cssSolved,
      JSSolved: e.jsSolved,
      ReactSolved: e.reactSolved,
      Marks: e.marks,
      MaxMarks: e.maxMarks,
      Status: e.status,
      Remarks: e.remarks,
      EvaluatedBy: e.evaluatedBy,
      EvaluatedAt: e.evaluatedAt ? e.evaluatedAt.toISOString() : ''
    }));

    const headers = ['Round', 'TeamCode', 'Participants', 'ErrorsSolved', 'TotalErrors', 'HTMLSolved', 'CSSSolved', 'JSSolved', 'ReactSolved', 'Marks', 'MaxMarks', 'Status', 'Remarks', 'EvaluatedBy', 'EvaluatedAt'];
    const csv = convertToCSV(data, headers);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="aarohan_round_${roundNum}_evaluations.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export Evaluations Error:', error);
    res.status(500).json({ message: 'Failed to export evaluations' });
  }
});

// @route GET /api/admin/export/activity-logs
router.get('/activity-logs', async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 });
    const data = logs.map(l => ({
      Actor: l.actor,
      Action: l.action,
      ParticipantID: l.participantId || '',
      RoundNumber: l.roundNumber || '',
      TeamID: l.teamId || '',
      OldValue: l.oldValue || '',
      NewValue: l.newValue || '',
      Details: l.details || '',
      Timestamp: l.timestamp ? l.timestamp.toISOString() : ''
    }));

    const csv = convertToCSV(data, ['Actor', 'Action', 'ParticipantID', 'RoundNumber', 'TeamID', 'OldValue', 'NewValue', 'Details', 'Timestamp']);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aarohan_activity_logs.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export Activity Logs Error:', error);
    res.status(500).json({ message: 'Failed to export activity logs' });
  }
});

module.exports = router;
