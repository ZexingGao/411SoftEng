var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
  if (err) throw err;
  var dbo = db.db("database");
  var testInstance = { track_id: "[track_id]" };
  dbo.collection("analysis").find(testInstance).toArray(function(err, result) {
    if (err) throw err;
    console.log(result);
    db.close();
  });
});