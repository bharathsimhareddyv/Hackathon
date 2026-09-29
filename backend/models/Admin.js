const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: 'Hackathon Admin' },
  role: { type: String, default: 'ADMIN' },
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
