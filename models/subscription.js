const mongoose = require('mongoose');

const SubscriptionSchema = mongoose.Schema({
  endpoint: {
    type: String,
    index: true
  },
  p256dh: {
    type: String
  },
  auth: {
    type: String
  }
});

const Subscription = module.exports = mongoose.model('Subscription', SubscriptionSchema);
