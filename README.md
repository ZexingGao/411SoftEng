# 411SoftEng
Section A2, Team 2: Jade Sessions, Zexing Gao, Boxi Huang, Keith Lovett
## Heartbeats: Heart-Rate-based Music Selection
### APIs and Authentication: Spotify and Fitbit
### Database: store user information, including personal playlist, recommendation list, etc.
Idea: It is often hard to create workout playlists that suit your individual workout needs. First, you need to choose a mood, songs you like, and then a similar tempo. If you want to run on the treadmill, it can be hard to tun to songs that do not match your speed or level of activity. For this problem, we would create an application that creates playlists for the user based on their heart rate. The application would use the user’s Fitbit in order to gauge information about the user’s heart rate and use that to create a playlist of songs that match the user’s tempo. Because Fitbits continuously log user information, we will be able to create a playlist based on the average heartbeat changes the user has throughout the day, as well as live creation, e.g creating a new playlist when the user is working out. Lastly, we will also be able to create playlists tailored to the user’s music preferences by using the Spotify API.

# How to Setup our app
1. Clone on your desktop!
2. Create Spotify developer account https://developer.spotify.com/dashboard/login. 
![Image](https://github.com/ZexingGao/411SoftEng/blob/master/docs/Picture6.png)
3. Register your new application, then set the Redirect URIs to http://localhost:8888/callback/.
![Image](https://github.com/ZexingGao/411SoftEng/blob/master/docs/Picture8.png)
4. Save the Client ID and Client Secret, you will need it later. 
![Image](https://github.com/ZexingGao/411SoftEng/blob/master/docs/Picture7.png)
5. Create Fitbit developer account https://dev.fitbit.com/apps/new.
![Image](https://github.com/ZexingGao/411SoftEng/blob/master/docs/Picture9.png)
6. Register your new application, then set the Callback URL to http://localhost:8888/callback/.
![Image](https://github.com/ZexingGao/411SoftEng/blob/master/docs/Picture10.png)
7. Save the OAuth 2.0 Client ID and Client Secret, you will need it later. 
8. Download node.js on your laptop. https://nodejs.org/en/download/
9. Open your console and go directory cd ..411SoftEng\demo\searcher. If there are anything package missing, try "npm install xxx". Install all necessary packages by inputting following command: npm install, npm install express, npm install express-session, npm install mongo, etc. 
10. If you see "Listening on 8888", then you finished your setup and ready to go. Go to your browser and type localhost:8888 to access our application. 
![Image](https://github.com/ZexingGao/411SoftEng/blob/master/docs/Picture11.png)

# How to use our app
First, log into Spotify. Next, log into Fitbit. At this point, the buttons continue from left to right: with the first one, your heartrate data will be obtained either via the Fitbit API or the database. Next, your most recently played artists will be obtained through Spotify. The next button will pair song tempos with any songs that are not currently in the database, and update the database with this new data. Next, a list of songs between the heartrate will be generated. And finally, a randomly selected playlist from your Spotify profile, will be used to recommend new tracks in the cardio heartrange.
