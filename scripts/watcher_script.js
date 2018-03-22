/*
 * Watcher script file
 *
 * This script checks the results folders for changes and updates the difference to mongoDB
 *
 * @package		Nodejs
 * @subpackage	Async, Chokidar, FS
 * @category		Script
 * @author		Vineet Eldochan
*/
var chokidar = require('chokidar');
var async = require('async');
var fs = require('fs');
var config_model = require('../models/config_model');

/***
 Function which is triggered when a file is added to the results folder
***/
var addfunction = function(path){
  async.waterfall([
    function(callback){
       console.log(`File ${path} has been added`)

        //Chokidar passes the path when a file is added. This function uses the path to read the file's content.
        fs.readFile(path, function(err,dat){
          if(err){

            //File read error. Stop the run, to fix this. We can implement other solutions like repeating the read etc.
            console.log("watcher_script: Error: "+JSON.stringify(err));
            callback({err:"watcher_script: Error: "+JSON.stringify(err), db: db});
          }else{
            if(dat > ""){

              //Converting string to JSON object
              var jp = "";
              try{
                jp = JSON.parse(dat);
              }catch(e){
                jp = "";
              }
            }

            if(jp != undefined && jp instanceof Array){
              //Confirming that the data is an array.
              callback(null, jp);
            }else{
              //Possibly a JSON parse error.
              callback({err: "watcher_script: Error: ParseError", db: db});
            }
          }
        });
    },
    function(jp, callback){
      // Connecting to the MongoDB client and setting the DB
      config_model.connectMongo(function(db){
          var dbo = db.db("statustoday");
          callback(null,jp,dbo,db);

      })
    },
    function(jp,dbo,db, callback){
        // Checking the db for the latest record. We are filtering based on the max date_last field.
        // The assumption here is that all new rows in the result would have a date_last value greater than the max date_last field added.
        try{
          dbo.collection("slack_updates").aggregate([{ $group : { _id: null, maxDateLast: { $max : "$date_last" }}}]).toArray().then(function(result){
            console.log("Max date_last: "+((result[0]||"").maxDateLast||""))
            if(((result[0]||"").maxDateLast||"") > ""){
                //Filtering out data which has date_last before the max date_last.
                //Only keeping rows with date_last > max(date_last from mongoDB)
                jp = jp.filter(function(f){ return f.date_last > result[0].maxDateLast })

            }
            callback(null, jp,dbo,db);
          });
        }catch(e){
          //If no rows are present an error is thrown, however it is skipped as the insert is yet to happen.
          callback(null, jp,dbo,db);
        }
      },
      function(jp,dbo,db, callback){

        // Deleting all rows with the same userid, ip, user agent and date_first combination, as their counts/date_last can change.
        if(jp.length > 0 ){
          var del = jp.map(function(e){ return {user_id:e.user_id, username: e.username, ip: e.ip, user_agent: e.user_agent, date_first: e.date_first} })
          // Looping through the list of combinations to delete.
          async.eachSeries(del, function(eachdel,callback){
            try{
              dbo.collection("slack_updates").deleteOne(eachdel, function(err,result) {
                // Displaying delete count and confirming success.
                if(err){
                  //We can consider repeating in case of errors.
                  console.log("addfunction: delete row: Error: "+err)
                }else{
                  if(result > ""){
                    // Converting result string to JSON.
                    var resjp = "";
                    try{
                      resjp = JSON.parse(result);
                    }catch(e){
                      resjp = "";
                      if(typeof(result) == "object"){
                        resjp = result;
                      }
                    }

                    if(resjp.n > "" && resjp.ok === 1){
                        console.log("Successfully deleted rows from DB: "+resjp.n);
                    }
                  }else{
                    console.log("addfunction: delete row: Error: Empty result");
                  }
                }

                process.nextTick(function(){ callback() });
              });
            }catch(e){
              // In case of any errors.
              console.log("watcher_script: DelError: "+e);
              process.nextTick(function(){ callback() });
            }
          },function(err){
            callback(null, jp,dbo,db);
          })
        }else{
          // if the difference is not present.
          console.log("Nothing to delete");
          callback(null, jp,dbo,db);
        }

      },
      function(jp,dbo,db, callback){
        // Inserts all the filtered data into MongoDB.
        try{
            if(jp.length > 0 ){
              dbo.collection("slack_updates").insertMany(jp,function(err,result){

                //Displaying insert count and confirming success
                if((((result||"").result||"").n||"") > "" && (((result||"").result||"").ok||"") === 1){
                  console.log("Successfully added to the DB:  "+result.result.n);
                }

                callback(null, db);
              });
            }else{
              // if the difference is not present
              console.log("Nothing to update/add");
              callback(null,db);
            }
        }catch(e){
          //In case of any errors, script is stopped.
          console.log("watcher_script: Error: "+e);
          callback({err:"watcher_script: Error "+e, db: db});
        }
      }

  ],function(err,db){
    // Closing the DB if there is an error or if it completes successfully.
    if(err != undefined){
      if(err.db != undefined){
          console.log("DB Connection Closed");
          err.db.close();
      }
    }else if(db != undefined){
      console.log("DB Connection Closed");
      db.close();
    }
    if(err){
      console.log("Addfunction: FinalSection: Error: "+err)
    }else{
      console.log("Data Reconciliation Complete");
    }
  })
}

// Actual Start
async.waterfall([
  function(callback){
    //Initializing config variables. Its a function, so that even if there are async items in the config in the future, this wont change.
    config_model.config(function(status){
      if(status == "done"){
        // Successfully initialized config model
        callback();
      }else{
        callback("Configuration error: Error: "+status);
      }
    });
  },
  function(callback){
    console.log("WATCH: "+config_model.watchpath)
    //Initializing watch over the results folder
    var watcher = chokidar.watch(config_model.watchpath, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    //Events for watcher. Right now only focusing on additions as each file is only added.
    watcher
      .on('add', addfunction)
      .on('change', path => console.log(`File ${path} has been changed`))
      .on('unlink', path => console.log(`File ${path} has been removed`))
      .on('ready', () => console.log(`Start`));

    callback();
  }
],
function(err){
  if(err){
    console.log("watcher_script: FinalSection: Error: "+err);
  }
});
