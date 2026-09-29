const mongoose = require('mongoose');

const OtpTokenSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  codeHash: { type: String, required: true },
  purpose: { type: String, enum: ['ADMIN_PASSWORD_CHANGE', 'SENSITIVE_ACTION'], default: 'ADMIN_PASSWORD_CHANGE' },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpToken', OtpTokenSchema);
