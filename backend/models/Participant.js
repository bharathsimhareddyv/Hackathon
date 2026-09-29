const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  arohanId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  passwordHash: { type: String, required: true },
  temporaryPasswordPlain: { type: String, default: null }, // Only viewable by Admin before first change if needed
  name: { type: String, default: null },
  college: { type: String, default: null },
  email: { type: String, default: null },
  active: { type: Boolean, default: true },
  termsAccepted: { type: Boolean, default: false },
  termsVersionAccepted: { type: String, default: null },
  forcePasswordChange: { type: Boolean, default: false },
  currentRound: { type: Number, default: 1 },
  status: {
    type: String,
    enum: [
      'REGISTERED',
      'TERMS_PENDING',
      'READY',
      'ROUND1_ACTIVE',
      'ROUND1_EVALUATION',
      'ROUND1_QUALIFIED',
      'ROUND1_NOT_QUALIFIED',
      'ROUND2_ACTIVE',
      'ROUND2_EVALUATION',
      'ROUND2_QUALIFIED',
      'ROUND2_NOT_QUALIFIED',
      'ROUND3_ACTIVE',
      'ROUND3_SUBMITTED',
      'FINAL_EVALUATION',
      'COMPLETED',
      'DISQUALIFIED'
    ],
    default: 'REGISTERED'
  }
}, { timestamps: true });

module.exports = mongoose.model('Participant', ParticipantSchema);
