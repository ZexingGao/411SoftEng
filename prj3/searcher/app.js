var express = require('express');
var request = require('request');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var FitbitApiClient = require("fitbit-node");

//Spotify sensitive information
var spotify_client_id = process.env['CLIENT_ID'];
var spotify_client_secret = process.env['CLIENT_SECRET'];

//Fitbit sensitive information
var fitbit_client_id = process.env['FITBIT_CLIENT_ID'];
var fitbit_client_secret = process.env['FITBIT_CLIENT_SECRET'];

//Shared information
var redirect_uri = process.env['REDIRECT_URI'];

var spotify_access_token = null;
var spotify_refresh_token = null;
var fitbit_access_token = null;

var client = new FitbitApiClient({
  clientId: fitbit_client_id,
  clientSecret: fitbit_client_secret,
  apiVersion: '1.2'
})

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

          // we can also pass the token to the browser to make requests from there
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

      res.redirect('/#' +
          querystring.stringify({
              spotify_access_token: spotify_access_token,
              spotify_refresh_token: spotify_refresh_token,
              fitbit_access_token: fitbit_access_token
      }));

      /*
      client.get('/activities/heart/date/today/1d.json', result.access_token).then(results => {
        res.redirect('/#' +
          querystring.stringify({
              fitbit_access_token: result.access_token
          }));
        });
      });*/
    })
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

console.log('Listening on 8888');
app.listen(8888);
