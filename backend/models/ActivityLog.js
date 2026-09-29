const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  actor: { type: String, required: true, default: 'Admin' },
  action: { type: String, required: true }, // e.g. "QUALIFICATION_CHANGE", "ROUND_TIMING_UPDATE", "MARKS_UPDATE"
  participantId: { type: String, default: null },
  roundNumber: { type: Number, default: null },
  teamId: { type: String, default: null },
  oldValue: { type: String, default: '' },
  newValue: { type: String, default: '' },
  details: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
