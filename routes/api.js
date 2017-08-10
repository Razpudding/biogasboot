const fs = require('fs');
const parse = require('csv-parse');
const express = require('express');
const moment = require('moment');
const DataPoint = require('../models/dataPoint');
const StatusPoint = require('../models/statusPoint');
const router = express.Router();
const usageCalculation = require('../modules/usage-calculation');
const feedCalculation = require('../modules/feed-calculation');
const gasCalculation = require('../modules/gas-calculation');
const config = require('../modules/config');

//TODO: rewrite so these routes dont use param(name) which is depracated but req.body
//TODO: rewrite so there's default start and enddate (or better error logging)
//Example of route: http://localhost:3000/api/range?api_key=[process.env.API_KEY]&dateStart=1501502400&dateEnd=1501804800
router.get('/range', (req, res, next) => {
  if (req.param('api_key') && req.param('api_key') == process.env.API_KEY) {
    const startDate = moment(Number(req.param('dateStart') * 1000));
    const endDate = moment(Number(req.param('dateEnd') * 1000));
    console.log("/range route activated with start, enddate: ", startDate, endDate);
    DataPoint.find({
      Date: {
        $gte: startDate.toDate(),
        $lt: endDate.toDate()
      }
    }).exec((err, data) => {
      res.send(data);
    });
  } else {
    res.send('No valid API key');
  }
});

router.get('/range/average', (req, res, next) => {
  if (req.param('api_key') && req.param('api_key') == process.env.API_KEY) {
    const startDate = moment(Number(req.param('dateStart') * 1000));
    const endDate = moment(Number(req.param('dateEnd') * 1000));
    DataPoint.aggregate([{
      $match: {
          Date: {
            $gte: startDate.toDate(),
            $lt: endDate.toDate()
          }
        }
    },
    {
      $group: {
          _id: null,
          Temp_PT100_1: {
            $avg: '$Temp_PT100_1'
          },
          Temp_PT100_2: {
            $avg: '$Temp_PT100_2'
          },
          pH_Value: {
            $avg: '$pH_Value'
          },
          Bag_Height: {
            $avg: '$Bag_Height'
          },
          count: {
            $sum: 1
          }
        }
    }
    ], (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    });
  } else {
    res.send('No valid API key');
  }
});

//http://localhost:3000/api/range/monthperday?dateStart=1470002400&dateEnd=1472680800&api_key=CMD17
router.get('/range/monthperday/', (req, res, next) => {
  if (req.param('api_key') && req.param('api_key') == process.env.API_KEY) {
    const startDate = moment(Number(req.param('dateStart') * 1000));
    const endDate = moment(Number(req.param('dateEnd') * 1000));
    DataPoint.aggregate([{
      $match: {
          Date: {
            $gte: startDate.toDate(),
            $lt: endDate.toDate()
          }
        },
    },
      {$group: {_id: {
        year: {$year: '$Date'},
        month: {$month: '$Date'},
        day: {$dayOfMonth: '$Date'}
       }, Temp_PT100_1: {
            $avg: '$Temp_PT100_1'
          },
          Temp_PT100_2: {
            $avg: '$Temp_PT100_2'
          },
          pH_Value: {
            $avg: '$pH_Value'
          },
          Bag_Height: {
            $avg: '$Bag_Height'
          },
          count: {
            $sum: 1
          },}
      },
      { $sort: {'_id.year':1, '_id.day':1} }
    ], (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    });
  } else {
    res.send('No valid API key');
  }
});

/* GET home page. */
router.get('/latest', (req, res, next) => {
  if (req.param('api_key') && req.param('api_key') == process.env.API_KEY) {
    DataPoint.findOne({}, {}, {
      sort: {
        Date: -1
      }
    }, (err, point) => {
      res.send(point);
    });
  } else {
    res.send('No valid API key');
  }
});

/* GET home page. */
router.get('/status', (req, res, next) => {
  if (req.param('api_key') && req.param('api_key') == process.env.API_KEY) {
    DataPoint.findOne({}, {}, {
      sort: {
        Date: -1
      }
    }, (err, point) => {
      res.send(config.tileSatus(point));
    });
  } else {
    res.send('No valid API key');
  }
});

router.get('/status/gas', (req, res, next) => {
  gasCalculation.get(req, res);
});

router.get('/status/range/:range', (req, res, next) => {
  if (req.param('api_key') && req.param('api_key') == process.env.API_KEY) {
    const range = req.params.range;
    usageCalculation.init(req, res, range);
  } else {
    res.send('No valid API key');
  }
});

router.get('/status/feed/', (req, res, next) => {
  if (req.param('api_key') && req.param('api_key') == process.env.API_KEY) {
    feedCalculation.get(req, res);
  } else {
    res.send('No valid API key');
  }
});

router.get('/status/all', (req, res, next) => {
  if (req.param('api_key') && req.param('api_key') == process.env.API_KEY) {
    usageCalculation.init(req, res);
  } else {
    res.send('No valid API key');
  }
});

module.exports = router;
