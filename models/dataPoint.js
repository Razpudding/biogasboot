const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); //TODO:remove
require('dotenv').config();         //TODO: remove

mongoose.connect(process.env.DB_URL); //TODO: remove

const db = mongoose.connection;     //TODO: remove

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
