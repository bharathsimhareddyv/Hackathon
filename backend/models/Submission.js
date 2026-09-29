const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoundTeam', default: null },
  teamCode: { type: String, default: '' },
  participantId: { type: String, uppercase: true, required: true },
  githubUrl: { type: String, default: '' },
  commitSha: { type: String, default: '' },
  zipPath: { type: String, default: '' },
  zipOriginalName: { type: String, default: '' },
  demoUrl: { type: String, default: '' },
  description: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['SUBMITTED', 'UNDER_REVIEW', 'EVALUATED'],
    default: 'SUBMITTED'
  }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
