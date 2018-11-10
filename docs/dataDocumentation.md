We are using MongoDB for a database. Because we will need to match tracks played to workout intensity, requesting track analysis data from Spotify's API will be useful. More specifically, the loudness, tempo, and confidence in this tempo analysis will be used to decide if or when a track should be played. This data can be stored in a cache, so that, when a song is being considered to play, an API request will not necessarily need to be made for songs that have already recently been played. The JSON schema will be is as follows:

{"_id": , "track_id": , "loudness": 0 , "tempo": 0, "tempo_confidence": 0}

We will use the track ID (track_id) as a key. This has a string format. Tempo, loudness, and tempo confidence are floats.

To see progress so far, see /databaseProgress.
