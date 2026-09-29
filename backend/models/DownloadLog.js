const mongoose = require('mongoose');

const DownloadLogSchema = new mongoose.Schema({
  participantId: { type: String, required: true, uppercase: true },
  roundNumber: { type: Number, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  projectName: { type: String, default: '' },
  downloadTime: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('DownloadLog', DownloadLogSchema);
