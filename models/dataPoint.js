const mongoose = require('mongoose');

const DataPointSchema = mongoose.Schema({
  Date: {
    type: Date
  },
  Temp_PT100_1: {
    type: Number
  },
  Temp_PT100_2: {
    type: Number
  },
  pH_Value: {
    type: Number
  },
  Bag_Height: {
    type: Number
  }
});

const DataPoint = module.exports = mongoose.model('DataPoint', DataPointSchema);
