const mongoose = require('mongoose');

const ProgressClaimSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoundTeam', required: true },
  teamAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamAccount', required: true },
  teamCode: { type: String, required: true },
  claimedPercentage: { type: Number, required: true, min: 0, max: 100 },
  claimedErrorsSolved: { type: Number, default: 0 },
  githubUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  zipPath: { type: String, default: '' },
  zipOriginalName: { type: String, default: '' },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

ProgressClaimSchema.index({ roundNumber: 1, teamId: 1, status: 1 });

module.exports = mongoose.model('ProgressClaim', ProgressClaimSchema);
