const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pointId: { type: mongoose.Schema.Types.ObjectId, ref: 'Point', required: true },
  scannedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', ScanSchema);
