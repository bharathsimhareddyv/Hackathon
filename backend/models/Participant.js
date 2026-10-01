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
    default: 'REGISTERED',
    validate: {
      validator: value => [
        'REGISTERED', 'TERMS_PENDING', 'READY', 'FINAL_EVALUATION', 'COMPLETED', 'DISQUALIFIED'
      ].includes(value) || /^ROUND\d+_(ACTIVE|EVALUATION|QUALIFIED|NOT_QUALIFIED|SUBMITTED)$/.test(value),
      message: props => `${props.value} is not a valid participant status`
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Participant', ParticipantSchema);
