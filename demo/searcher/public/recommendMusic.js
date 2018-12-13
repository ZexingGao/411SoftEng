export const setBPM = (bpm)=> {
    document.getElementById("user-bpm").innherHTML = "bpm";
};

let access_token = "";
let refresh_token = "";

function setTokens(access, refresh){
    access_token = access;
    refresh_token = refresh;
}
function recommendMusic() {
    let playlistID = document.getElementById("playlist-ID").value;
    let tempo = document.getElementById("tempo").value;
    console.log("recommendMusic clicked", tempo, playlistID);
    getPlaylistArtists(playlistID).then((artists) => {
        console.log("Artists: ", artists);
        getRelatedArtists(artists).then((relatedArtists)=>{
            console.log("RELATED ARTISTS", relatedArtists);
            getRecommendedSongs(relatedArtists).then((recommendedSongs)=>{
                console.log("REC SONGS:", recommendedSongs);
                performSongAnalysis(recommendedSongs, tempo).then((result)=> {
                    document.getElementById("recommend-music-results").innerHTML = result;
                })
            })
        })
    });
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
