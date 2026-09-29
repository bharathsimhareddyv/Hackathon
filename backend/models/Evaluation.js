const mongoose = require('mongoose');

const EvaluationSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoundTeam', required: true },
  teamCode: { type: String, required: true },
  participantIds: [{ type: String }],
  
  // Debugging fields (Round 1)
  totalErrors: { type: Number, default: 200 },
  errorsSolved: { type: Number, default: 0 },
  htmlSolved: { type: Number, default: 0 },
  cssSolved: { type: Number, default: 0 },
  jsSolved: { type: Number, default: 0 },
  reactSolved: { type: Number, default: 0 },
  
  // Generic / Round 2 / Round 3 breakdown fields
  tasksCompleted: { type: Number, default: 0 },
  maxTasks: { type: Number, default: 10 },
  codeQuality: { type: Number, default: 0 }, // max 10/20
  functionality: { type: Number, default: 0 }, // max 10/20
  uiUx: { type: Number, default: 0 }, // max 10/20
  innovation: { type: Number, default: 0 },
  presentation: { type: Number, default: 0 },
  
  // Marks & Status
  marks: { type: Number, required: true, default: 0 },
  maxMarks: { type: Number, required: true, default: 100 },
  remarks: { type: String, default: '' },
  status: {
    type: String,
    enum: ['PENDING', 'QUALIFIED', 'NOT_QUALIFIED', 'DISQUALIFIED'],
    default: 'PENDING'
  },
  evaluatedBy: { type: String, default: 'Admin' },
  evaluatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

EvaluationSchema.index({ roundNumber: 1, teamId: 1 }, { unique: true });

module.exports = mongoose.model('Evaluation', EvaluationSchema);
