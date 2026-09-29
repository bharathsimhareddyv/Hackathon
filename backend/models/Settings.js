const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  hackathonName: { type: String, default: 'AAROHAN PROGRAM HACKATHON' },
  programName: { type: String, default: 'Aarohan Tribal Youth Empowerment' },
  logoUrl: { type: String, default: '' },
  description: { type: String, default: 'Learn • Debug • Build • Innovate' },
  contactInfo: { type: String, default: 'support@aarohan-hackathon.org' },
  leaderboardPublic: { type: Boolean, default: true },
  forceTermsAcceptance: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
