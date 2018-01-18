const mongoose = require('mongoose');

const AlarmSchema = mongoose.Schema({
  Date: {
    type: Date
  },
  Event: {
    type: String
  },
  Group: {
    type: String
  },
  AlarmName: {
    type: String
  }
});

const DataPoint = module.exports = mongoose.model('Alarm', AlarmSchema);
