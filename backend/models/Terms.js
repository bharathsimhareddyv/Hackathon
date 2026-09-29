const mongoose = require('mongoose');

const TermsSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true, default: '1.0' },
  content: { type: String, required: true },
  isCurrent: { type: Boolean, default: true },
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Terms', TermsSchema);
