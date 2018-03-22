/*
 * Config Model file
 *
 * All configurations for the scripts would go here. One stop for all configs.
 * This part can even be configured to pick configuration info from a server
 *
 * @package		Nodejs
 * @subpackage
 * @category		Model
 * @author		Vineet Eldochan
*/

exports.config = function(callback){
  // Slack legacy access token, if another authentication is preferred let me know.
  exports.slack_access_token = "";
  if((exports.slack_access_token||"") == ""){
     return callback("Please assign the slack key");
  }
  exports.slack_interval = 3600000;

  //Max count = 100
  exports.slack_count = 100;

  // Path to watch using Chokidar
  exports.watchpath = '/results'; // Only modify this
  var currentdir = `${__dirname}`;
  exports.watchpath = currentdir.split("/").slice(0,-1).join("/")+exports.watchpath;
  //Figuring out the right path from models folder.

  // Setting up MongoClient centrally so that the object is shared.
  exports.MongoClient = require('mongodb').MongoClient;
  var url = "mongodb://localhost:27017/statustoday";

  exports.connectMongo = function(callback){
    exports.MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      console.log("DB Connected");
      callback(db);
    });
  }
  callback("done");
}
