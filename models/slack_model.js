/*
 * Slack Model file
 *
 * This script sends api calls to Slack
 *
 * @package		Nodejs
 * @subpackage		RequestJS, FS
 * @category		Model
 * @author		Vineet Eldochan
*/

var request = require('request');
var fs = require('fs');
var config_model = require('./config_model');
var API_HOST = 'https://slack.com/api/';


exports.SlackResourceGet = function(Obj,callback){
  //Header for the request to Slack
  var header = {
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  var puri = API_HOST;
  var flg = 0;

  // Generating the url based on the parameter passed.
  if(Obj.type == "team.accessLogs"){
    puri = puri+Obj.type;
    puri = puri+"?token="+config_model.slack_access_token
    if(Obj.count > ""){
      if(Obj.count < 101){
          puri = puri+"&count="+Obj.count;
      }
    }
  }else{
    // In case there are errors in the parameters a flag is raised.
    flg = 1;
  }

  if(flg == 0){

    var filedat = [];
    //Function would repeat to get data from all pages. Can modify this to make the first call in series and the rest of the pages in parallel.
    var repeat_req = function(pObj,callback){
      var uri = puri;
      if(pObj.page > 0){
        uri = puri+"&page="+pObj.page;
      }

      request.get({url: uri, method: 'GET', headers: header}, function(err,resp,body){
        if(err){
          // Can consider repeating on errors.
          console.log("slack_model: Error: "+JSON.stringify(err));
          callback("slack_model: Error: "+JSON.stringify(err))
        }else{
          if(body > ""){

            //Converting string to JSON
            var jp = "";
            try{
              jp = JSON.parse(body.toString());
            }catch(e){
              jp = "";
              // If body is already a JSON object use that directly
              if(typeof(body) == "object"){
                jp = body;
              }
            }

            if(jp > ""){
              //Confirming that the call was successful.
              if(jp.ok === true && jp.logins > "" && jp.logins instanceof Array){
                //Concatenating login info from all pages.
                filedat = filedat.concat(jp.logins);
              }

              //Check to confirm if we have reached the last page.
              if(((jp.paging||"").pages||0) != ((jp.paging||"").page||0)){
                if(((jp.paging||"").page||0) > 0){
                  //If not the last page, repeat call.
                  repeat_req({page:(++jp.paging.page)},callback);
                }
              }else{
                  // JSON Result
                  callback(null,jp);
              }

            }else{
              console.log("slack_model: Error: Parse Error");
              callback("slack_model: Error: Parse Error")
            }
          }else{
            console.log("slack_model: Error: Empty Body");
            callback("slack_model: Error: Empty Body")
          }
        }

      })
    }
    repeat_req({page:0},function(err,res){
      // Writing to file with a datetimestamp.
      if(filedat.length > 0){
        var filename= Math.round((new Date()/1000))+'.json';
        fs.writeFile('./results/'+filename, JSON.stringify(filedat),function(err){
          if(err){
            console.log("File write failed");
          }else{
            console.log("File write successful");
          }
          callback(err,res);
        })
      }
    })
  }else{
    console.log("slack_model: Error: Incorrect parameters");
    callback("slack_model: Error: Incorrect parameters");
  }
}
