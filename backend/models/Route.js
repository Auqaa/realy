const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  points: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Point' }],
  totalReward: { type: Number, default: 0 },
  image: { type: String },
  city: { type: String, default: 'Рязань' }
});

module.exports = mongoose.model('Route', RouteSchema);
