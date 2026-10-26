const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  username: { type: String, required: true, trim: true, lowercase: true, unique: true },
  passwordHash: { type: String, required: true },
  loginEnabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Branch', BranchSchema);
