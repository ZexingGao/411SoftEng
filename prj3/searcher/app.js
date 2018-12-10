var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = process.env['CLIENT_ID']; // Your client id
var client_secret = process.env['CLIENT_SECRET']; // Your secret
var redirect_uri = process.env['REDIRECT_URI']; // Your redirect uri

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
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read playlist-read-private playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
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
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/refresh_artist', function(req, res) {
        console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
  // requesting access token from refresh token
  var input = req.query.test;
  var access_token = req.query.access_token;

  // console.log(input);
  // console.log(access_token);
    var scope = 'user-read-private user-read-email';

  var authOptions = {
    url: 'https://api.spotify.com/v1/artists/' + req.query.test,
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.get(authOptions, function(error, response, body) {
    // console.log(response);
    // console.log(body);
    // console.log(body.name);
      console.log("************************")
    if (!error && response.statusCode === 200) {
      var name = body.name;
      res.send({
        'name': name
      });
    }
  });
});
//

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
            let tempo = body.tempo;
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
            let resultingString = "<h4>Your New Playlist!<\/h4>";
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

app.get('/testing_testing', function(req, res) {

  console.log(req.query.test);

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      //NEW

      var access_token = body.access_token
      var name;

      var options = {
        url: 'https://api.spotify.com/v1/artists/' + req.query.test,
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      // use the access token to access the Spotify Web API
      request.get(options, function(error, response, body) {
        console.log(body);
        name = body.name;
      });

      console.log(name);

      //END NEW


      var access_token = body.access_token;
      res.send({
        'access_token': access_token,
        'name': name
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);
