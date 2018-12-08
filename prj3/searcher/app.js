var express = require('express');
var request = require('request');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var FitbitApiClient = require("fitbit-node");

var mongoClient = require('mongodb').MongoClient;
var mongoURL = "mongodb://localhost:27017/";

//Spotify sensitive information
var spotify_client_id = process.env['CLIENT_ID'];
var spotify_client_secret = process.env['CLIENT_SECRET'];

//Fitbit sensitive information
var fitbit_client_id = process.env['FITBIT_CLIENT_ID'];
var fitbit_client_secret = process.env['FITBIT_CLIENT_SECRET'];

//Shared information
var redirect_uri = process.env['REDIRECT_URI'];

//We need to store these for the URL after we redirect.
var spotify_access_token = null;
var spotify_refresh_token = null;
var fitbit_access_token = null;

var client = new FitbitApiClient({
  clientId: fitbit_client_id,
  clientSecret: fitbit_client_secret,
  apiVersion: '1.2'
})

var today  = new Date();
if (today.getDate() < 10 && (today.getMonth() + 1) < 10) {
  //Both the month and day require a 0 infront.
  today = today.getFullYear() + '-0' + (today.getMonth() + 1) + '-0' + today.getDate();
} else if (today.getDate() < 10 && (today.getMonth() + 1) > 10) {
  //Just the day requires a 0 infront.
  today = today.getFullYear() + '-' + (today.getMonth() + 1) + '-0' + today.getDate();
} else if (today.getDate() > 10 && (today.getMonth() + 1) < 10) {
  //Just the month requires a 0 infront.
  today = today.getFullYear() + '-0' + (today.getMonth() + 1) + '-' + today.getDate();
} else if (today.getDate() > 10 && (today.getMonth() + 1) > 10) {
  //Neither the day nor the month requires a 0 infront.
  today = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
}

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser())
   .use(session({secret: 'hekdhthigib', resave: true, saveUninitialized: true}));

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: spotify_client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/login-fitbit', function(req, res) {

  // See https://dev.fitbit.com/apps "411 Project" for information on this specific auth.
  //res.redirect(client.getAuthorizeUrl('activity heartrate location nutrition profile settings sleep social weight', 'http://localhost:8888/callback/'));
  var scope = 'activity heartrate location nutrition profile settings sleep social weight';

  res.redirect('https://www.fitbit.com/oauth2/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: fitbit_client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      expires_in: "604800"
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  //Code (either from Spotify or Fitbit) to be exchanged for auth tokens.
  var code = req.query.code || null;

  //Spotify's callback has 250 characters. Fitbit's has 40 characters.
  if (code.length == 250) {

    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
      res.redirect('/#' +
        querystring.stringify({
        error: 'state_mismatch'
      }));
    } else {
      res.clearCookie(stateKey);
      var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
          code: code,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code'
        },
        headers: {
          'Authorization': 'Basic ' + (new Buffer(spotify_client_id + ':' + spotify_client_secret).toString('base64'))
        },
        json: true
      };

      request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {

          spotify_access_token = body.access_token;
          spotify_refresh_token = body.refresh_token;

          //Displays the authorization code in the terminal.
          /*
          var options = {
            url: 'https://api.spotify.com/v1/me',
            headers: { 'Authorization': 'Bearer ' + spotify_access_token },
            json: true
          };

          // use the access token to access the Spotify Web API
          request.get(options, function(error, response, body) {
            console.log(body);
          });*/

          // We can also pass the token to the browser to make requests from there. (I.e. place the token in the URL.)
          // Notice, we won't have the Fitbit access token at this point. Only two variables should be included in the URL.
          res.redirect('/#' +
            querystring.stringify({
              spotify_access_token: spotify_access_token,
              spotify_refresh_token: spotify_refresh_token
            }));
        } else {
          res.redirect('/#' +
            querystring.stringify({
              error: 'invalid_token'
            }));
        }
      });
    }
  } else if (code.length == 40) {

    client.getAccessToken(code, redirect_uri).then(result => {

      fitbit_access_token = result.access_token;

      /*
      //The format of this is going to be a single item in a list followed by 'IncomingMessage.' Hence we get the first item.
      client.get("/profile.json", result.access_token).then(results => {
        console.log(results[0]);
        res.send(results[0]);
        //console.log(results[0]['user']['age']);
      }).catch(err => {
        res.status(err.status).send(err);
      }); //Catch for the profile get.
      */


      //Notice now we have the fitbit_access token. This is going to redirect us with these variables in the URL.
      res.redirect('/#' +
          querystring.stringify({
              spotify_access_token: spotify_access_token,
              spotify_refresh_token: spotify_refresh_token,
              fitbit_access_token: fitbit_access_token
      }));

      //The format of this is going to be a single item in a list followed by 'IncomingMessage.' Hence we get the first item.
      client.get('/activities/heart/date/today/1d.json', result.access_token).then(results => {
        console.log(results[0]);
      });
    }).catch(err => {
      res.status(err.status).send(err);
    }); // Catch for the accessToken.
  }
});

/*
app.get('/fitbit_token', function(req, res) {

  // requesting access token from refresh token
  /*var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
   form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  var 

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'fitbit_access_token': access_token
      });
    }
  });
});*/

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var spotify_refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(spotify_client_id + ':' + spotify_client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: spotify_refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var spotify_access_token = body.access_token;
      res.send({
        'spotify_access_token': spotify_access_token
      });
    }
  });
});

app.get('/refresh_artist', function(req, res) {

  // requesting access token from refresh token
  var input = req.query.spotify_artist_id;
  var spotify_access_token = req.query.spotify_access_token;

  //console.log(input);
  //console.log(spotify_access_token);

  var authOptions = {
    url: 'https://api.spotify.com/v1/artists/' + req.query.spotify_artist_id,
    headers: { 'Authorization': 'Bearer ' + spotify_access_token },
    json: true
  };

  request.get(authOptions, function(error, response, body) {
    //console.log(response);
    //console.log(body);
    //console.log(body.name);
    if (!error && response.statusCode === 200) {
      var name = body.name;
      res.send({
        'name': name
      });
    }
  });
});

function queryDatabase(req) {
  return new Promise(resolve => {
    console.log("TODAY: ", today);

    if (req == "/refresh_heartrate?dateTime=" + today) {
      console.log(req);
      mongoClient.connect(mongoURL, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        var dbo = db.db("database");
        //Right now this is just querying for some random key, but this can be changed later.
        //To test adding a new, unique data item, query for something different than what we know
        //exists... like "[track_id]test"
        //var testInstance = { track_id: "[track_id]" };
        var testInstance = { dateTime: today };
        console.log("testInstance", testInstance);
        dbo.collection("analysis").find(testInstance).toArray(function(err, result) {
          if (err) throw err;
          db.close();
          //Resolve ends the promise, acting like a return.
          resolve(result);
        });
      });
    } else {
      console.log("test");
    }

  });
}

app.get('/refresh_heartrate', async function(req, res) {
  //Notice, this function ulitizes the database, so we use async.

  //Obtains the URL to identify the parameters being used in the database.
  urlQuery = req['socket']['parser']['incoming']['originalUrl'];

  //Queries the database to see if appropriate data currently resides there.
  //This must be synchronized, hence the await.
  var databaseResult = await queryDatabase(urlQuery);
  console.log(databaseResult);

  //If the result from the database was 0, then the item was not in the database. Perform an API request.
  if (databaseResult.length == 0) {
    //The format of this is going to be a single item in a list followed by 'IncomingMessage.' Hence we get the first item.
    client.get('/activities/heart/date/' + today + '/1d.json', fitbit_access_token).then(results => {
      //var testing = insertDatabase(urlQuery, results);
      //console.log(results[0]);
      //console.log(results[0]['activities-heart'][0]['value']);
      results[0]['inDatabase'] = 0;
      console.log("DATABASE RESULT:", results[0]);
      res.send(results[0]);
    }).catch(err => {
      res.status(err.status).send(err);
    }); //Catch for the get.
  } else {
    //Else, the information is in the database. Send the result back to the front end.
    console.log("Exists in database already.");
    databaseResult['inDatabase'] = 1;
    console.log("DATABASE RESULT:", databaseResult);
    res.send(databaseResult);
  }
  
});

app.get('/add-to-db', function(req, res) {

  //Inserts a query specified in the front-end function call by req.query into database.

  mongoClient.connect(mongoURL, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("database");
    dbo.collection("analysis").insertOne(req.query, function(err, res) {
      if (err) throw err;
      console.log("Analysis inserted.");
      db.close();
    });
  });

  res.send(true);
});

console.log('Listening on 8888');
app.listen(8888);
