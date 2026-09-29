const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roundNumber: { type: Number, required: true },
  description: { type: String, default: '' },
  filePath: { type: String, default: null }, // local ZIP path
  originalFileName: { type: String, default: null },
  fileSize: { type: Number, default: 0 },
  githubUrl: { type: String, default: '' },
  instructions: { type: String, default: '' },
  // Debugging specifics
  totalErrors: { type: Number, default: 200 },
  htmlErrors: { type: Number, default: 50 },
  cssErrors: { type: Number, default: 50 },
  jsErrors: { type: Number, default: 50 },
  reactErrors: { type: Number, default: 50 },
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
