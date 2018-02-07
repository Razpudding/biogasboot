const fs = require('fs');
const path = require('path');
const moment = require('moment');
const webPush = require('web-push');
require('dotenv').config();
const parse = require('csv-parse');
const config = require('./config');
const dataPoint = require('../models/dataPoint');
const Subscription = require('../models/subscription');

// Make objects for D3.js
const getUsedValues = function () {
  let i = 0;
  const values = [];
  for (const key in config.defineValues) {
    i++;
    values.push({
      name: config.defineValues[key].name,
      title: config.defineValues[key].title,
      min: config.defineValues[key].min,
      max: config.defineValues[key].max,
      high: config.defineValues[key].high,
      low: config.defineValues[key].low
    });
  }
  if (i === Object.keys(config.defineValues).length) {
    return values;
  }
};
// Fill the values
const usedValues = getUsedValues();
let payload;

// Send notification
function sendNotification(subscription, payload) {
  // Set notification settings in promise
  webPush.sendNotification({
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  }, payload).then(() => {
    console.log('Push Application Server - Notification sent to ' + subscription.endpoint);
  }).catch(err => {
    // Remove from subscription list in DB when there is a error
    Subscription.findOneAndRemove({
      endpoint: subscription.endpoint
    }, (err, docs) => {});
    console.log('ERROR in sending Notification, endpoint removed ' + subscription.endpoint);
    console.log(err);
  });
}

function sendGasBagHigh() {
  // Get all subscriptions and push message
  Subscription.find((err, subscriptions) => {
    // Message payload (now static but needs to be dynamic)
    payload = 'De gaszak word te hoog!';
    // Loop trough all the subscriptions
    for (let i = 0; i < subscriptions.length; i++) {
      sendNotification(subscriptions[i], payload);
    }
  });
}

function sendGasBagLow() {
  // Get all subscriptions and push message
  Subscription.find((err, subscriptions) => {
    // Message payload (now static but needs to be dynamic)
    payload = 'De gaszak word te laag!';
    // Loop trough all the subscriptions
    for (let i = 0; i < subscriptions.length; i++) {
      sendNotification(subscriptions[i], payload);
    }
  });
}

const webSockets = {
  init(app, io, dbOld){
    console.log("working with old db?", dbOld)
    this.app = app;
    this.io = io;
    if(dbOld){
      serveLoop()
    }
  },
  //This function queries the db and either serves some data on a loop as a demo or the latest datapoint
  serveLoop(){  
    // Setting parameters for getting data out of the database
    const playBackTime = moment().hour(-1);  //Determines how far back the data is loaded for the realtime overview. If it's 0, only new data is shown
    const startDate = this.dbOld? moment(Number(range) * 1000) : playBackTime;
    const endDate = this.dbOld? moment(Number(1503187200) * 1000) : moment();
    const liveStreamDelay = 1000; //This determines how often new data should be sent to the client. Ideally it would get sent right when it comes in
    // Query the database
    dataPoint.find({
      Date: {
        $gte: startDate.toDate(),
        $lt: endDate.toDate()
      }
    })
      .sort([['Date', 'ascending']])
      // Execute script after getting data
      .exec((err, dataPoints) => {
        console.log(dataPoints.length);
        if(dataPoints.length <= 0){
          console.log("No data found, datavis will show nothing :(")
          return;
        }
        let i = 0;
        //Send data to the client at set intervals
        setInterval(() => {
          if (i >= dataPoints.length){
            i = 0
          }
          this.io.sockets.emit('dataPoint', Array(dataPoints[i]), config.tileStatus(dataPoints[0]));  //TODO: the last argument is not used I think, investigate and remove
          i++;
        }, liveStreamDelay);
      });
  },
  //Send a user some initial data so the realtime graph has something to show
  sendInitialData(){
    console.log("sending user initial data")
    dataPoint.find()
      .sort([['Date', 'descending']])
      .limit(150)
      // Execute script after getting data
      .exec((err, dataPoints) => {
        this.io.sockets.emit('dataPoint', dataPoints, config.tileStatus(dataPoints[0])); 
      });
  },
  //Send a user a single datapoint
  sendOne(dataPoint){
    console.log('sending single datapoint', dataPoint)
    this.io.sockets.emit('dataPoint', Array(dataPoint), config.tileStatus(dataPoint));  //TODO: the last argument is not used I think, investigate and remove
  }
}

module.exports = webSockets;