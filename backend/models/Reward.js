const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  cost: { type: Number, required: true },
  promoCode: { type: String, required: true, unique: true },
  partnerName: { type: String },
  image: { type: String }
});

module.exports = mongoose.model('Reward', RewardSchema);
