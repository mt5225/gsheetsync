var promise = require('bluebird');
var mongoose = require('mongoose');
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var Record = require('./record.model');
var OP = require('./op.model');
var OPLOG = {
  process: 0,
  insert: 0,
  updated: 0,
  total: 0,
}

// plugin bluebird promise in mongoose
mongoose.Promise = promise;

// connect to mongo db
mongoose.connect("mongodb://localhost/calc2", { server: { socketOptions: { keepAlive: 1 } } });
mongoose.connection.on('error', () => {
  throw new Error('unable to connect to database');
});

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
  process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), listAndSave);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function (err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function (code) {
    rl.close();
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}
/**
 *  get rid of blank space
 */
function notBlankSpace(rows) {
  var rowNew = [];
  for (var i = 0; i < rows.length; i++) {
    rowNew[i] = rows[i].trim()
  }
  return rowNew
}
/**
 * sync to mongoDB
 */
function listAndSave(auth) {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
    auth: auth,
    spreadsheetId: '11CBwj0LwlNIYeBqZOuZHd3Y7KZ6u5t6OHKdf6-ex6jc',
    range: 'Sheet1!A2:L',
  }, function (err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var rows = response.values;
    if (rows.length == 0) {
      console.log('No data found.');
    } else {
      var ops = [];
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row[1] && row[2] && row[4] && row[5] && row[6]) { //sync rule
          ops.push(saveToMongo(notBlankSpace(row)));
        }
      }
      promise.all(ops).then(function () {
        OPLOG.process = ops.length;
        var oplog = new OP({
          process: OPLOG.process,
          insert: OPLOG.insert,
          updated: OPLOG.updated,
          total: OPLOG.total,
        })
        oplog.save().then(
          function (savedRecord) {
          }
        ).catch(
          function (e) {
            console.log(row);
            console.log(e);
          }
          ).finally(function () {
            process.exit();
          });
      });
    }
  });
}


/**
 * save to mongo
 */
function saveToMongo(row) {
  var checkInDate = new Date(row[3].replace(/\./g, "/"));
  var checkOutDate = new Date(row[4].replace(/\./g, "/"));
  var totalNight = row[6] ? row[6] : "N/A";
  var market = row[7] ? row[7] : "N/A";
  var sales = row[8] ? row[8] : "N/A";
  var op = row[9] ? row[9] : "N/A";
  var nationality = row[10] ? row[10] : "N/A";
  var record = {
    UUID: row[2],
    CustomerId: row[0],
    Name: row[1],
    CheckIn: checkInDate,
    CheckOut: checkOutDate,
    Room: row[5],
    TotalNight: totalNight,
    Market: market,
    Sales: sales,
    Operation: op,
    Nationality: nationality,
  };
  var query = { 'UUID': record.UUID };
  return Record.findOneAndUpdate(query, record, { upsert: true }).then(
    function (doc) {
      OPLOG.total += 1;
      if (doc) {
        OPLOG.updated += 1;
      } else {
        OPLOG.insert += 1;
      }
    }
  ).catch(
    function (e) {
      console.log(row);
      console.log(e);
    }
    );
}
