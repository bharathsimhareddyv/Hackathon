const mongoose = require('mongoose');

const RoundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true, unique: true }, // 1, 2, 3
  name: { type: String, required: true }, // e.g. DEBUGGING CHALLENGE
  type: { type: String, enum: ['DEBUGGING', 'REACT_GITHUB', 'APPLICATION'], required: true },
  description: { type: String, default: '' },
  instructions: { type: String, default: '' },
  startAt: { type: Date, default: Date.now },
  endAt: { type: Date, default: () => new Date(Date.now() + 3600000 * 2) },
  status: {
    type: String,
    enum: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'CLOSED', 'EVALUATION', 'COMPLETED'],
    default: 'SCHEDULED'
  },
  maxMarks: { type: Number, default: 100 },
  qualificationCriteria: {
    minErrorsSolved: { type: Number, default: 120 },
    minPercentage: { type: Number, default: 60 },
    minMarks: { type: Number, default: 60 },
    ruleType: { type: String, enum: ['OR', 'AND'], default: 'OR' }
  },
  githubRepoUrl: { type: String, default: '' },
  githubBranch: { type: String, default: 'main' },
  active: { type: Boolean, default: false },
  criteriaSummary: { type: String, default: '' },
  requiredMinPercentage: { type: Number, default: 60 }
}, { timestamps: true });

module.exports = mongoose.model('Round', RoundSchema);
