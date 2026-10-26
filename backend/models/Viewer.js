const mongoose = require('mongoose');

const ViewerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  username: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 50 },
  passwordHash: { type: String, required: true },
  loginEnabled: { type: Boolean, default: true },
  roundNumbers: [{ type: Number }],
  allBranches: { type: Boolean, default: true },
  branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
  permissions: {
    roundProgress: { type: Boolean, default: true },
    branchStatistics: { type: Boolean, default: true },
    branchAverages: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Viewer', ViewerSchema);
