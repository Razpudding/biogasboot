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

function webSokets(app, io) {
  const dbOld = false  //Old means we connect to the old database with the old data selection, new means, well you get it
  // Setting paramerts for getting data out of the database
  //TODO: replace this with logic that selects the last month of data auto. start and end are hardcoded for the moment
  const range = 1501502400; //IMPORTANT: this date range refers to the month of august 2017 the new data stream starts now
  //                                        (2018) so the startdate timestamp has to be more recent.
  const inputRange = 1; //This is a hack in the old system that allows a loop of # months. Currently one
  const months = moment.duration(inputRange, 'months').valueOf();
  const startDate = dbOld? moment(Number(range) * 1000) : moment().day(-1); //A week ago
  // const endDate = moment(Number(startDate + months));
  const endDate = dbOld? moment(Number(1503187200) * 1000) : moment(); //Right now
  console.log(moment());
  console.log(moment());
  
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
      // Setting variables for sending data to the frontend
      let i = 0;
      //What does sendItemsCount do and why is it 30?
      const sendItemsCount = 30;
      // Stop backend from spamming notifcations
      let sendTimeOutHigh = false;
      let sendTimeOutLow = false;

      //This next line serves to replace the looping functionality below
      setInterval(() => {
        console.log(dataPoints[i])
        if (i >= dataPoints.length){
          i = 0
        }
        io.sockets.emit('dataPoint', dataPoints[i], config.tileStatus(dataPoints[0]));  //TODO: the last argument is not used I think, investigate and remove
        i++;
      }, 1000);
      //TODO: this event doesnt seem to arrive on the clientside. Might be that its fired before the client can receive it.
      //      Reactivate the delayed constant firing mechanism with setinterval below

      /* This is the old looping code which serves 30 datapoints as one collection
      //TODO: remove this when real data comes in. Resetting to an arbtrary point in time doesn't seem useful after that
      // For simulating real-time this interval was made, resetting I when index is too high
      setInterval(() => {
        if (!dataPoints[i + sendItemsCount]) {
          console.log("Ran out of data to serve, resetting index and reserving data from start")
          i = 0;
        }
        const dataCollection = [];
        // Looping over data collection and checking if bag height is in range.
        //TODO: turned this func off because it was buggy. Fix and turn on again later
        for (let x = 0; x < sendItemsCount; x++) {
          dataCollection.push(dataPoints[x + i]);
          // if (dataPoints[x + i].Bag_Height >= usedValues[2].high) {
          //   //Why is it x+i-1, wouldn't that result in datapoint[-1] on the first run, which would yield undefined?
          //   if (dataPoints[x + i - 1].Bag_Height < usedValues[2].high && sendTimeOutHigh === false) {
          //     sendTimeOutHigh = true;
          //     sendGasBagHigh();
          //   }
          // } else if (dataPoints[x + i].Bag_Height <= usedValues[2].low) {
          //   if (dataPoints[x + i - 1].Bag_Height > usedValues[2].low && sendTimeOutLow === false) {
          //     sendTimeOutLow = true;
          //     sendGasBagLow();
          //   }
          // }
        }
        i += sendItemsCount;
        sendTimeOutHigh = false;
        sendTimeOutLow = false;
        // emitting the data to the frontend
        io.sockets.emit('dataPoint', dataCollection, config.tileStatus(dataPoints[i]));
      }, 500);
      */
    });
}

module.exports = webSokets;
