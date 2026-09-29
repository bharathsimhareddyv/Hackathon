const mongoose = require('mongoose');

const RoundTeamSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  teamCode: { type: String, required: true },
  teamAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamAccount', default: null },
  memberNames: [{ type: String, trim: true }],
  participantIds: [{ type: String, uppercase: true, trim: true }],
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Ensure teamCode is unique per round
RoundTeamSchema.index({ roundNumber: 1, teamCode: 1 }, { unique: true });

module.exports = mongoose.model('RoundTeam', RoundTeamSchema);
