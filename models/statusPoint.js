const mongoose = require('mongoose');

const StatusPointSchema = mongoose.Schema({
  Date: {
    type: Date
  },
  Storagetank_Mixe: {
    type: Number
  },
  Storagetank_Feed: {
    type: Number
  },
  Digester_Mixer: {
    type: Number
  },
  Digester_Heater_1: {
    type: Number
  },
  Digester_Heater_2: {
    type: Number
  },
  Gaspump: {
    type: Number
  },
  Mode_Stop: {
    type: Number
  },
  Mode_Manual: {
    type: Number
  },
  Mode_Auto: {
    type: Number
  },
  System_Started: {
    type: Number
  },
  Additive_Pump: {
    type: Number
  }
});

const StatusPoint = module.exports = mongoose.model('statuspoint', StatusPointSchema);
