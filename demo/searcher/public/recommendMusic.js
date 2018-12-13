let BPM = 0;

let access_token = "";
let refresh_token = "";

function setSpotifyTokens(access, refresh){
    console.log("tokens", access, refresh)
    access_token = access;
    refresh_token = refresh;
}
function setBPM(bpm){
    console.log("bpm", bpm)
    BPM = bpm;
    document.getElementById("user-bpm").innerHTML = BPM + " BPM";
}
function recommendMusic() {
   document.getElementById("user-bpm").innherHTML = BPM;
    let tempo = parseInt(BPM);
    getRandomPlaylist().then((playlistID)=>{
        console.log("playlist id: ", playlistID);
        getPlaylistArtists(playlistID).then((artists) => {
            console.log("Artists: ", artists);
            getRelatedArtists(artists).then((relatedArtists)=>{
                console.log("RELATED ARTISTS", relatedArtists);
                getRecommendedSongs(relatedArtists).then((recommendedSongs)=>{
                    console.log("REC SONGS:", recommendedSongs);
                    performSongAnalysis(recommendedSongs, tempo).then((result)=> {
                        console.log(result)
                        document.getElementById("final-list").innerHTML = result;
                    })
                })
            })
        });
    });

}
function getRandomPlaylist(){
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/get_random_playlist',
            data: {
                'refresh_token': refresh_token,
                'access_token': access_token
            }
        }).done(function(data) {
            resolve(data);
        });
    })
}
function performSongAnalysis(recommendedSongs, tempo){
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/perform_song_analysis',
            data: {
                'refresh_token': refresh_token,
                'access_token': access_token,
                'recommendedSongs': recommendedSongs,
                'tempo': tempo
            }
        }).done(function(data) {
            resolve(data);
        });
    })
}

function getRecommendedSongs(relatedArtists){
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/get_recommended_songs',
            data: {
                'refresh_token': refresh_token,
                'access_token': access_token,
                'relatedArtists': relatedArtists
            }
        }).done(function(data) {
            resolve(data);
        });
    })
}
function getRelatedArtists(artists){
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/get_related_artists',
            data: {
                'refresh_token': refresh_token,
                'access_token': access_token,
                'artists': artists
            }
        }).done(function(data) {
            resolve(data);
        });
    })
}

function getPlaylistArtists(playlistID){
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/get_artists',
            data: {
                'refresh_token': refresh_token,
                'access_token': access_token,
                'playlist_ID': playlistID
            }
        }).done(function(data) {
            resolve(data);
        });
    })
}

