/*
 * Main app file
 *
 * This script initiates the Slack API call and performs the necessary checks/update.
 *
 * @package		Nodejs
 * @subpackage	Async, Child Process
 * @category		App
 * @author		Vineet Eldochan
*/

var async = require('async');
var cp = require('child_process')
var slack_model = require('./models/slack_model');
var config_model = require('./models/config_model');

async.waterfall([
  function(callback){
    //Initializing config variables. Its a function, so that even if there are async items in the config in the future, this wont change.
    config_model.config(function(status){
      if(status == "done"){
        console.log("Configuration Complete");
        callback();
      }else{
        callback("Configuration Error: Error: "+status)
      }
    })
  },
  function(callback){
    //This is to run the slack call immediately when the script starts. The interval based call would only start once the interval period is complete
    slack_model.SlackResourceGet({type: "team.accessLogs", count: config_model.slack_count},function(err,res){
      if(err){
        // Can consider repeating on errors.
        console.log("Mainapp: slackerror: Error: "+err);
      }else{
        //Just using a simple interval function. Alternatives include checking time and confirming duration.
        var intval = setInterval(function(){
          slack_model.SlackResourceGet({type: "team.accessLogs", count: config_model.slack_count},function(err,res){
            if(err){
              clearInterval(intval);
            }
          })
        },config_model.slack_interval)
      }
    })

    //For ease, have included the watcher scripts initiation here. We can keep it separate and initiate it using cron or service or anything like it.
    var fp = cp.fork(`${__dirname}/scripts/watcher_script.js`)

    //For ease, have included the app_service initiation here. We can keep it separate and initiate it using cron or service or anything like it.
    var fp = cp.fork(`${__dirname}/app_service.js`)
  }
],function(err){
  //The script would keep looping unless an error occurs.
  if(err){
    console.log("Error: "+err);
  }else{
    console.log("Complete")
  }
})
