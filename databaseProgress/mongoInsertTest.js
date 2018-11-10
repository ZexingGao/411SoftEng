var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
  if (err) throw err;
  var dbo = db.db("database");
  var testInstance = { track_id: "[track_id]", loudness: 0.0, tempo: 0.0, tempo_confidence: 0.0};
  dbo.collection("analysis").insertOne(testInstance, function(err, res) {
    if (err) throw err;
    console.log("Analysis inserted.");
    db.close();
  });
});
