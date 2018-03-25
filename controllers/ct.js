/*
 * Controller file
 *
 * This script adds logic for the routes specified in app_service.js file
 *
 * @package		Nodejs
 * @subpackage	FS
 * @category		Controller
 * @author		Vineet Eldochan
*/
var fs  = require('fs');
var config_model = require('../models/config_model');
var slack_model = require('../models/slack_model');

/**
  Function called when a POST request is made to /slack/eventsapi
**/
exports.challengeResponse = function(req,res,next){
  // Checking if the request body contains data.
  if(req.body > ""){
    //console.log("BODY: "+JSON.stringify(req.body));
    // Parsing request body if its sent as a string.
    var jp = "";
    try{
      jp = JSON.parse(req.body);
    }catch(e){
      jp = "";
      if(typeof(req.body) =="object"){
        jp = req.body
      }
    }

    //console.log("JP: "+JSON.stringify(jp));
    // Checking JSON object to avoid null and undefined condition
    if(jp > ""){
      // Confirming the event came from Slack using the verification token
      if(jp.token == config_model.slack_verification_token){

        // If the request contains a challenge for initial check at Slack
        if(jp.challenge > ""){

          //Sending back the challenge result.
          res.send(200,{"challenge":jp.challenge})

        }else if((jp.event||"").type  > ""){
          // Executed if event data is sent.

          // Creating file for events.
          var filename= Math.round((new Date()/1))+'_events.json';
          fs.writeFile(config_model.watchpath+'/'+filename, JSON.stringify(jp),function(err){
            if(err){
              // If file write fails, sending a 500 response.
              console.log("File write failed: "+err);
              res.send(500,{error:"File write failed"});
            }else{
              res.send(200,{success:"Complete"});
            }
          });

        }else{
          // All other variations of JSON received. Setting a 200 so that it does not repeat.
          res.send(200,{success: "Not Recognised"});
        }
      }else{
        // Responding with a 500 if the verification token fails
        res.send(500, {error: "Verification Failed"})
      }
    }else{
      // Possibly a parse error.
      res.send(500,{error: "Parse Error"})
    }

  }else{
    // Request body was empty
    res.send(500,{error: "No Body present"});
  }

  next();
}

/**
  Function called when a GET request is made to /slack/profile_get
**/
exports.profileGet = function(req,res,next){
    // Making a request to slack_model
    slack_model.SlackResourceGet({type: "users.profile.get"},function(err,rtn){
      if(err){
        res.send(500,err);
      }else{
        res.send(200,rtn);
      }
    });
    next();
}

/**
  Function called when a POST request is made to /slack/profile_set
**/
exports.profileSet = function(req,res,next){
  // This call needs a JSON body to be passed containing fields that need to be updated in the profile
  if(req.body > ""){
    // Parsing JSON if its a string.
    var jp = "";
    try{
      jp = JSON.parse(req.body);
    }catch(e){
      jp = "";
      if(typeof(req.body) == "object"){
        jp = req.body;
      }
    }

    if(jp > ""){
      // Making request to slack_model
      slack_model.SlackResourceGet({type: "users.profile.set", data: jp},function(err,rtn){
        if(err){
          res.send(500,err);
        }else{
          res.send(200,rtn);
        }
      });
    }else{
      // Possibly a parse error
      res.send(500, {error: "Parse Error"});
    }
  }else{
    // If the request does not have body
    res.send(500, {error: "Empty Body Error"});
  }
  next();

}

/**
  Function called when a GET request is made to /slack/presence_get or /slack/presence_get/user/:userid
**/
exports.presenceGet = function(req,res,next){

    var passreq = {type: "users.getPresence"}

    // Checking if the call contains a userid
    if(req.params > ""){
      if(req.params.userid > ""){
        passreq.userid = req.params.userid
      }
    }

    // Making a request to slack_model
    slack_model.SlackResourceGet(passreq,function(err,rtn){
      if(err){
        res.send(500,err);
      }else{
        res.send(200,rtn);
      }
    });
    next();
}

/**
  Function called when a POST request is made to /slack/presence_set/:presence
**/
exports.presenceSet = function(req,res,next){
  // This call requires a presence to be sent to it.
  if(req.params > ""){
    // We can consider processing the types of presence and limiting network access, right now I am letting slack api decide.

    // Making a request to slack_model
    slack_model.SlackResourceGet({type: "users.setPresence", presence: (req.params.presence||"")},function(err,rtn){
      if(err){
        res.send(500,err);
      }else{
        res.send(200,rtn);
      }
    });

  }else{
    // Error if no presence value is sent
    res.send(500, {error: "Presence not present Error"});
  }
  next();

}

exports.test = function(req,res,next){
  // Just a function to test if the node service is running or not.
  res.send("Node service is up and running");
  next();
}
