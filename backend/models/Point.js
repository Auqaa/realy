const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  qrCodeValue: { type: String, required: true, unique: true },
  reward: { type: Number, default: 10 },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  order: { type: Number, default: 0 },
  facts: [{ question: String, answer: String }]
});

module.exports = mongoose.model('Point', PointSchema);
