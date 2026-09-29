const mongoose = require('mongoose');

const TermsAcceptanceSchema = new mongoose.Schema({
  participantId: { type: String, required: true, uppercase: true },
  termsVersion: { type: String, required: true },
  acceptedAt: { type: Date, default: Date.now },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, { timestamps: true });

TermsAcceptanceSchema.index({ participantId: 1, termsVersion: 1 }, { unique: true });

module.exports = mongoose.model('TermsAcceptance', TermsAcceptanceSchema);
