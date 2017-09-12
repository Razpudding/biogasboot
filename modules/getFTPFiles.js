const fs = require('fs');
const path = require('path');
const JSFtp = require('jsftp');
const moment = require('moment');
const parse = require('csv-parse');
const config = require('./config');

require('dotenv').config();

const FTP = module.exports = config.ftp();

const checkForNewFilesIn = function (directoryKey) {
  // Get latest file in directory
  new JSFtp(FTP.setup).ls(FTP[directoryKey].directory, (err, res) => {
    const ftpFiles = res.map(dataPoint => dataPoint.name);
    syncFTPwithMongoDatabase(directoryKey, ftpFiles);
  });
};

function checkForNewLocalFiles(directoryKey) {
  // Check localy for new files if FTP is not working
  //Make sure to filter out annoying .DS_Store files
  fs.readdir(path.join(__dirname, FTP[directoryKey].downloadDir), (err, files) => {
    files.filter(item => !item.includes("DS_Store")).forEach(file => {
      fs.readFile(path.join(__dirname, `${FTP[directoryKey].downloadDir}${file}`), (err, data) => {
        console.log("Adding file to mongodb",directoryKey, file);
        if (err) throw err;
        parseFileDataToJSON(data, directoryKey);
      });
    });
  });
}

function syncFTPwithMongoDatabase(directoryKey, ftpFiles) {
  // Check if the dates of the file names in mongo are also in MongoDB
  FTP[directoryKey].schema.distinct('Date', (err, date) => {
    if (err) throw err;
    // Get all possible schema dates and format them to YYMMDD which can be compared with the dates from FTP
    date = date.map(date => {
      return moment(date, 'DD-MM-YYYY').format('YYMMDD');
    });
    const uniqueDates = date.filter((date, index, array) => {
      return array.indexOf(date) === index;
    });
    // Files not in mongo are the filenames which are not yet in mongo download them
    const filesNotInMongo = compareFTPDatesWithMongo(uniqueDates, ftpFiles);
    downloadMissingData(directoryKey, filesNotInMongo);
  });
}

function compareFTPDatesWithMongo(datesInMongo, ftpFiles) {
  /**
   * If unique dates does include the file don't filter it from files.
   */
  return ftpFiles.filter(file => {
    return !datesInMongo.includes(file.split('.')[0]);
  });
}

function downloadMissingData(directoryKey, filesNotInMongo) {
  // Create directory if not exists
  if (!fs.existsSync(path.join(__dirname, `${FTP[directoryKey].downloadDir}`))) fs.mkdirSync(path.join(__dirname, `${FTP[directoryKey].downloadDir}`));
  // Download each file which is not in mongo to the download directory
  filesNotInMongo.forEach(file => {
    new JSFtp(FTP.setup).get(`${FTP[directoryKey].directory}${file}`, path.join(__dirname, `${FTP[directoryKey].downloadDir}${file}`), hadErr => {
      if (hadErr) throw hadErr;
      else
        fs.readFile(path.join(__dirname, `${FTP[directoryKey].downloadDir}${file}`), (err, data) => {
          // Readfile parse it to json, add to mongo and remove it
          if (err) throw err;
          parseFileDataToJSON(data, directoryKey);
          removeDownloadedFTPFile(file, directoryKey);
        });
    });
  });
}

function removeDownloadedFTPFile(file, directoryKey) {
  // Unlink downloaded file
  fs.unlink(path.join(__dirname, `.${FTP[directoryKey].downloadDir}${file}`));
}

function parseFileDataToJSON(data, directoryKey) {
  // Parse data from file to json
  //console.log("parseFileDataToJSON called with directoryKey:",directoryKey);
  //console.log("expected columns:", FTP[directoryKey].fileColumns)
  parse(data, {
    delimiter: ',',
    columns: FTP[directoryKey].fileColumns
  }, (err, parsedData) => {
    if (err) throw err;
    parsedData.shift(); // Remove headers from arrays
    parsedData = parsedData.map(dataPoint => {
      // Convert Date & Time to Date object
      dataPoint.Date = moment(`${dataPoint.Date} ${dataPoint.Time}`, 'DD/MM/YYYY HH:mm:ss').add(1, 'hours').format('YYYY-MM-DD HH:mm:ss');
      delete dataPoint.Time;
      return dataPoint;
    });
    addFileToMongo(parsedData, directoryKey);
  });
}

function addFileToMongo(data, directoryKey) {
  // Insert whole json to mongo
  FTP[directoryKey].schema.insertMany(data)
    .then(mongooseDocuments => {})
    .catch(err => {
      console.log(err);
    });
}

module.exports.checkForNewFilesIn = checkForNewFilesIn;
module.exports.checkForNewLocalFiles = checkForNewLocalFiles;
