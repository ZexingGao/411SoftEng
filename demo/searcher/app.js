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
});

var today  = new Date();
if (today.getDate() < 9 && (today.getMonth() + 1) < 9) {
  //Both the month and day require a 0 infront.
  today = today.getFullYear() + '-0' + (today.getMonth() + 1) + '-0' + today.getDate();
} else if (today.getDate() < 9 && (today.getMonth() + 1) > 9) {
  //Just the day requires a 0 infront.
  today = today.getFullYear() + '-' + (today.getMonth() + 1) + '-0' + today.getDate();
} else if (today.getDate() > 9 && (today.getMonth() + 1) < 9) {
  //Just the month requires a 0 infront.
  today = today.getFullYear() + '-0' + (today.getMonth() + 1) + '-' + today.getDate();
} else if (today.getDate() > 9 && (today.getMonth() + 1) > 9) {
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
};//

var stateKey = 'spotify_auth_state';

var app = express(); //

// var socket = io.connect('http://localhost');
// socket.on('set-bpm', function (bpm) {
//     console.log(bpm);
//     document.getElementById("user-bpm").innerHTML = bpm;
// });

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser())
   .use(session({secret: 'hekdhthigib', resave: true, saveUninitialized: true}));

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-read-recently-played playlist-read-private playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: spotify_client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});
app.get('/get_artists', function(req, res) {
    var access_token = req.query.access_token;
    var authOptions = {
        url: 'https://api.spotify.com/v1/playlists/'+ req.query.playlist_ID + '/tracks',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
    };

    request.get(authOptions, function(error, response, body) {
        console.log(body);
        if (!error && response.statusCode === 200) {
            let artistIDs= [];
            let items = body.items ;
            for (let i =0; i < items.length; i++){
                artistIDs.push(items[i].track.artists[0].id);
            }
            let filteredArray = artistIDs.filter(function(item, pos) {
                return artistIDs.indexOf(item) === pos; //removes duplicates
            });
            res.send(filteredArray);
        }
    });
});
app.get('/get_random_playlist', function(req, res) {
    var access_token = req.query.access_token;
    var authOptions = {
        url: 'https://api.spotify.com/v1/me/playlists',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
    };

    request.get(authOptions, function(error, response, body) {
        console.log(body);
        if (!error && response.statusCode === 200) {
            let items = body.items ;
            let playlistObj = items[Math.floor(Math.random()*items.length)];
            res.send(playlistObj.id);
        }
    });
});

app.get('/get_related_artists', function(req, res) {
    var access_token = req.query.access_token;

    let relatedArtists = [];
    let finished =0;
    for (let i = 0; i < req.query.artists.length; i++){
        var authOptions = {
            url: 'https://api.spotify.com/v1/artists/'+ req.query.artists[i]+ '/related-artists',
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
        };
        request.get(authOptions, function(error, response, body) {
            let recommendedArtists = body.artists;
            if (!error && response.statusCode === 200) {
                for (let j =0; j < Math.min(4, recommendedArtists.length); j++){
                    relatedArtists.push([recommendedArtists[j].id, recommendedArtists[j].name])
                }
                finished +=1
            }
        });
    }//
    function waitUntilFinished() {
        if(finished < req.query.artists.length) {
            setTimeout(waitUntilFinished, 100);
        } else {
            let filteredArray = relatedArtists.filter(function(item, pos) {
                return relatedArtists.indexOf(item) === pos; //removes duplicates
            });
            res.send(filteredArray)
        }
    }
    waitUntilFinished();
});

app.get('/get_recommended_songs', function(req, res) {
    var access_token = req.query.access_token;

    let recommendedSongs = [];
    let finished =0;
    for (let i = 0; i < req.query.relatedArtists.length; i++){
        let currentArtist = req.query.relatedArtists[i];
        var authOptions = {
            url: 'https://api.spotify.com/v1/artists/'+ currentArtist[0]+ '/top-tracks?market=US',
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
        };
        request.get(authOptions, function(error, response, body) {
            let tracks = body.tracks;
            if (!error && response.statusCode === 200) {
                for (let j =0; j < Math.min(4, tracks.length); j++){
                    let currID = tracks[j].id;
                    let trackName = tracks[j].name;
                    let obj = {};
                    // console.log("artists name ", currentArtist[1])
                    obj[currID] = [currentArtist[1], trackName];
                    recommendedSongs.push(obj)
                }
                finished +=1
            }
        });
    }

    function waitUntilFinished() {
        if(finished < req.query.relatedArtists.length) {
            setTimeout(waitUntilFinished, 100);
        } else {
            let filteredArray = recommendedSongs.filter(function(item, pos) {
                return recommendedSongs.indexOf(item) === pos; //removes duplicates
            });
            res.send(filteredArray)
        }
    }
    waitUntilFinished();
});

app.get('/perform_song_analysis', function(req, res) {
    var access_token = req.query.access_token;

    let result = [];
    let finished =0;
    let songObjectsList = Object.entries(req.query.recommendedSongs);
    for (let i = 0; i < songObjectsList.length; i++){
        let currentSongObject = songObjectsList[i][1];
        let key = Object.keys(currentSongObject)[0]; //holds the song id
        var authOptions = {
            url: 'https://api.spotify.com/v1/audio-features/'+ key,
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
        };//
        request.get(authOptions, function(error, response, body) {
            let tempo = body.tempo; //
            if (!error && response.statusCode === 200) {
                if (parseInt(req.query.tempo) - 10 >=  tempo <= parseInt(req.query.tempo) + 10){
                    result.push(currentSongObject)
                }
                finished +=1
            }
        });
    }

    function waitUntilFinished() {
        if(finished < songObjectsList.length) {
            setTimeout(waitUntilFinished, 100);
        } else {
            let resultingString = "<h4>Check out these songs!!<\/h4>";
            for (let i =0; i < result.length; i ++){
                let songObj = result[i];
                let currKey = Object.keys(songObj)[0];
                resultingString += "<p>"+ songObj[currKey][1] + " by " + songObj[currKey][0] + "<\/p>"
            }
            res.send(resultingString)
        }
    }
    waitUntilFinished();
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
  //Probably should come up with a more general solution to this, because the length
  //of the string changes depending on what scopes are added.
  if (code.length >= 250) {

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

      //Notice now we have the fitbit_access token. This is going to redirect us with these variables in the URL.
      res.redirect('/#' +
          querystring.stringify({
              spotify_access_token: spotify_access_token,
              spotify_refresh_token: spotify_refresh_token,
              fitbit_access_token: fitbit_access_token
      }));

    }).catch(err => {
      res.status(err.status).send(err);
    }); // Catch for the accessToken.
  }
});

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
    if (!error && response.statusCode === 200) {
      var name = body.name;
      res.send({
        'name': name
      });
    }
  });
});

app.get('/refresh_tempo', async function(req, res) {

  // requesting access token from refresh token
  var spotify_access_token = req.query.spotify_access_token;

  //This does not have the tempo until it is appended in this function.
  var trackWithTempo = req.query.track;

  //Obtains the URL to identify the parameters being used in the database.
  urlQuery = req['socket']['parser']['incoming']['originalUrl'];

  //Queries the database to see if appropriate data currently resides there.
  //This must be synchronized, hence the await.
  var databaseResult = await queryDatabase(urlQuery, trackWithTempo.id);

  console.log(databaseResult);

  //console.log(input);
  //console.log(spotify_access_token);

  var authOptions = {
    url: 'https://api.spotify.com/v1/audio-features/' + req.query.track.id,
    headers: { 'Authorization': 'Bearer ' + spotify_access_token },
    json: true
  };

  if (databaseResult.length == 0) {
    request.get(authOptions, function(error, response, body) {
      //console.log(body.tempo);
      trackWithTempo['track_tempo'] = parseInt(body.tempo,10);
      trackWithTempo['inDatabase'] = 0;
      console.log(trackWithTempo);

      if (!error && response.statusCode === 200) {
        res.send(trackWithTempo);
      }
    });
  } else {
    databaseResult['inDatabase'] = 1;
    res.send(databaseResult);
  }
});

app.get('/refresh_recent_tracks', function(req, res) {

  //Obtains a list of recently played tracks (and other information),
  //returns a list of recently played tracks (without extra info.)

  // requesting access token from refresh token
  var spotify_access_token = req.query.spotify_access_token;

  var authOptions = {
    url: 'https://api.spotify.com/v1/me/player/recently-played',
    headers: { 'Authorization': 'Bearer ' + spotify_access_token },
    json: true
  };

  request.get(authOptions, function(error, response, body) {

    if (!error && response.statusCode === 200) {

      items = []

      for (var i = 0; i < response.body.items.length; i++) {

        track = {
          id: response.body.items[i].track.id,
          name: response.body.items[i].track.name
        }

        items.push(track);

      }

      console.log(items);

      res.send({
        'items': items
      });
    }
  });
});

function queryDatabase(req, key) {
  return new Promise(resolve => {

    if (req == "/refresh_heartrate?dateTime=" + key) {
      //The key in this case is the value of "today."
      mongoClient.connect(mongoURL, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        var dbo = db.db("database");
        //To test adding a new, unique data item, query for something different than what we know
        //exists... like "[track_id]test"
        var testInstance = { dateTime: key };
        console.log("testInstance", testInstance);
        dbo.collection("analysis").find(testInstance).toArray(function(err, result) {
          if (err) throw err;
          db.close();
          //Resolve ends the promise, acting like a return.
          resolve(result);
        });
      });
    } else if (req.includes("/refresh_tempo")) {
      //The key in this case is the id of the song.
      console.log(key);
      mongoClient.connect(mongoURL, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        var dbo = db.db("database");
        //To test adding a new, unique data item, query for something different than what we know
        //exists... like "[track_id]test"
        var testInstance = { id: key };
        console.log("testInstance", testInstance);
        dbo.collection("analysis").find(testInstance).toArray(function(err, result) {
          if (err) throw err;
          db.close();
          //Resolve ends the promise, acting like a return.
          resolve(result);
        });
      });
      //resolve(false);
    } else {
      console.log("No query matched.");
    }

  });
}

function queryRateRange() {
  return new Promise(resolve => {
    mongoClient.connect(mongoURL, { useNewUrlParser: true }, function(err, db) {
      if (err) throw err;
      var dbo = db.db("database");
      //To test adding a new, unique data item, query for something different than what we know
      //exists... like "[track_id]test"
      var maxIndex = 0;
      var maxMinutes = 0;
      var testInstance = { dateTime: today };
      //console.log("testInstance", testInstance);
      dbo.collection("analysis").find(testInstance).toArray(function(err, result) {
        if (err) throw err;
        for (var i = 0; i < result[0].value.heartRateZones.length; i++) {
          if (parseInt(result[0].value.heartRateZones[i].minutes,10) > maxMinutes) {
            maxIndex = i;
            maxMinutes = parseInt(result[0].value.heartRateZones[i].minutes,10);
          }
        }
        maxHeartrate = parseInt(result[0].value.heartRateZones[maxIndex].max,10);
        minHeartrate = parseInt(result[0].value.heartRateZones[maxIndex].min,10);
        db.close();
        resolve([minHeartrate, maxHeartrate]);
      });
    });
  });
}

app.get('/form_list', async function(req, res) {

  var average = 0;
  var maxHeartrate = 0;
  var minHeartrate = 0;

  var rateRange = await queryRateRange();

  console.log("RATE RANGE,", rateRange);

  mongoClient.connect(mongoURL, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("database");
    //var testInstance = { track_tempo: { $gt: rateRange[0].toString(), $lt: rateRange[1].toString() } };
    //var num = 90;
    var testInstance = { track_tempo: { $gt: rateRange[0], $lt: rateRange[1] } };
    console.log("testInstance", testInstance);
    dbo.collection("analysis").find(testInstance).toArray(function(err, result) {
      if (err) throw err;
      console.log(result);
      db.close();
      finalList = [];
      for (var i = 0; i < result.length; i++) {
        var finalListItem = {
          id : result[i].id,
          name : result[i].name,
          track_tempo : result[i].track_tempo
        }
        finalList.push(finalListItem);
      }
      res.send(finalList);
    });
  });

});

app.get('/refresh_heartrate', async function(req, res) {
  //Notice, this function ulitizes the database, so we use async.

  //Obtains the URL to identify the parameters being used in the database.
  urlQuery = req['socket']['parser']['incoming']['originalUrl'];

  //Queries the database to see if appropriate data currently resides there.
  //This must be synchronized, hence the await.
  var databaseResult = await queryDatabase(urlQuery, today);
  console.log(databaseResult);

  //If the result from the database was 0, then the item was not in the database. Perform an API request.
  if (databaseResult.length == 0) {
    //The format of this is going to be a single item in a list followed by 'IncomingMessage.' Hence we get the first item.
    client.get('/activities/heart/date/' + today + '/1d.json', fitbit_access_token).then(results => {
      results[0]['inDatabase'] = 0;
      res.send(results[0]);
    }).catch(err => {
      res.status(err.status).send(err);
    }); //Catch for the get.
  } else {
    //Else, the information is in the database. Send the result back to the front end.
    console.log("Exists in database already.");
    databaseResult['inDatabase'] = 1;
    res.send(databaseResult);
  }
  
});

app.get('/add-to-db', function(req, res) {

  //Inserts a query specified in the front-end function call by req.query into database.
  console.log(req.query);

  var pieceToAdd = req.query;

  //Because we need to parse the int out of the tempo (to compare with the max min date range)
  //we parse it out of the query here.
  if (req.query.track_tempo) {
    pieceToAdd = {
      id : req.query.id,
      name : req.query.name,
      track_tempo : parseInt(req.query.track_tempo,10)
    }
  }

  mongoClient.connect(mongoURL, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var dbo = db.db("database");
    dbo.collection("analysis").insertOne(pieceToAdd, function(err, res) {
      if (err) throw err;
      console.log("Analysis inserted.");
      db.close();
    });
  });

  res.send(true);
});

console.log('Listening on 8888');
app.listen(8888);
