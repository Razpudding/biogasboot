// Load all datapoints
const DataPoint = require('../models/dataPoint');

// Object with methods for needed calculations
const gasCalculations = {
  total(req, res) {
    /* Get all instances with a bagheight higher than 20 and lower than 220
       Has to be lower than 220 because of the fact that the bag can't get higher than
       220cm. Not lower than 20cm because then the bag can't be filled anymore */
    DataPoint.aggregate([
      {
        $project: {
          Bag_Height: "$Bag_Height",
        }
      },
      {
        $match: {
          Bag_Height: {
            $lte: 220,
            $gte: 20
          }
        }
      }
    ], (err, results) => {
      totalData = {
        used: 0,
        generated: 0
      }
      let last = 0;
      results.forEach(function(result) {
        totalGas = 2.82 * 2.34 * (result.Bag_Height / 100);
        if(last === 0) {
          last = totalGas;
        } else if(totalGas > last) {
          totalData.generated += totalGas - last;
        } else if(totalGas < last) {
          console.log(last - totalGas)
          totalData.used += last - totalGas;
        }
        last = totalGas;
      })
      res.send(totalData)
    })

  }
}

module.exports = gasCalculations;
