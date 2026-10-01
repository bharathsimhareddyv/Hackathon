const mongoose = require('mongoose');

const TeamAccountSchema = new mongoose.Schema({
  loginId: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: { type: String, required: true },
  temporaryPasswordPlain: { type: String, default: null },
  memberNames: [{ type: String, trim: true }],
  contactEmails: [{ type: String, trim: true, lowercase: true }],
  termsAccepted: { type: Boolean, default: false },
  termsVersionAccepted: { type: String, default: null },
  currentRound: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['ACTIVE', 'BLOCKED', 'ELIMINATED', 'DISQUALIFIED', 'QUALIFIED_PENDING'],
    default: 'ACTIVE'
  },
  eliminatedAtRound: { type: Number, default: null },
  welcomeEmailSentAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('TeamAccount', TeamAccountSchema);
