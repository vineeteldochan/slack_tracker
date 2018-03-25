/*
 * Main app file
 *
 * REST api to send and receive data from Slack API
 *
 * @package		Nodejs
 * @subpackage	Restify, Async, Domains, Cluster
 * @category		App
 * @author		Vineet Eldochan
*/

var cluster = require('cluster');

if(cluster.isMaster) {
    var numWorkers = require('os').cpus().length;

    console.log('Master cluster setting up ' + numWorkers + ' workers...');

    for(var i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', function(worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function(worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
    });

	cluster.on('disconnect', function(worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('NOT Starting a new worker as it would be created when it exits');
        //cluster.fork();
    });
} else {
	const domain = require('domain');
    var d = domain.create();
    d.on('error', function(er){
      console.error('error', er.stack);

        try {
        // Close down within 1 seconds.
        var killtimer = setTimeout(function(){
          process.exit(1);
        }, 1000);

        killtimer.unref();

        // Disconnect cluster worker.
        cluster.worker.disconnect();

      } catch (er2) {
        // Error message logged.
        console.error('Error sending 500!', er2.stack);
      }
    });


    // Running server in the domain.
    d.run(() => {

      // Initializing restify and other services
      var restify = require('restify');
      var async = require('async');
      var ct = require('./controllers/ct');
      var config_model = require('./models/config_model');

      // Setting the timezone to UTC.
      process.env.TZ = "UTC";

  		var app = restify.createServer({
  		  name: 'slack_tracker',
            handleUncaughtExceptions: true
  		});

      // Initializing processor plugins
      app.server.setTimeout(3600 * 1000);
      app.pre(restify.plugins.pre.userAgentConnection())
      app.pre(restify.pre.sanitizePath());
      app.use(restify.plugins.acceptParser(app.acceptable));
  		app.use(restify.plugins.authorizationParser());
  		app.use(restify.plugins.dateParser());
  		app.use(restify.plugins.queryParser());
  		app.use(restify.plugins.bodyParser());




  		// Routes: Call mapping
      // GET calls
      app.get('/slack/profile_get', ct.profileGet);
      app.get('/slack/presence_get', ct.presenceGet);
      app.get('/slack/presence_get/user/:userid', ct.presenceGet);
      app.get('/test', ct.test);

      // POST calls
  		app.post('/slack/eventsapi', ct.challengeResponse);
      app.post('/slack/profile_set', ct.profileSet);
      app.post('/slack/presence_set/:presence', ct.presenceSet);
      

      // In case of an uncaught exception its ideal to kill the application and start again, however here we are killing the cluster for recovery.
  		app.on('uncaughtException', function (req, res, route, err) {

  				console.log('Error sending 500!',err.stack+"\n REQUEST: "+JSON.stringify((req.params||""))+" Body: "+JSON.stringify((req.body||""))+" URL: "+(req.url||""));
  				console.log(err.message);
          // Sending response to client
          if(!res.headersSent){
              res.contentType = 'json';
              res.send(500,err.stack+"\n REQUEST: "+JSON.stringify((req.params||""))+" Body: "+JSON.stringify((req.body||""))+" URL: "+(req.url||""));
              res.end();
          }
          // Close down within 1 seconds.
  				var killtimer = setTimeout(() => {
  				  process.exit(1);
  				}, 1000);

  				killtimer.unref();

  				// Disconnect cluster worker.
  				cluster.worker.disconnect();
  		});

      // Restify's version of uncaught exception
      app.on('restifyError', function(req, res, err, cb) {
          console.log("RESTIFY ERROR: ");
          console.log(err.toString());

          return cb();
      })





  		async.waterfall([
  			function(callback){
  				console.log("Configuring Server");
  				config_model.config(function(result){
  					if(result == "done"){
  						console.log("Configuration Complete")
  						callback();
  					}else{
              // Error in configuration
  						callback(result);
  					}
  				});
  			},
  			function(callback){
          // App listening to port 8080. Awaiting requests.
  				app.listen(8080, function () {
  				  console.log("Executing in the "+process.env.NODE_ENV+" environment.")
  				  console.log('%s listening at %s', app.name, app.url);
  				  callback();
  				});
  			}
  		],
  		function(err,result){
        //In case of errors, show error and exist
  			if(err){
  				console.log(JSON.stringify(err));
  				process.exit(1);
  			}else{
  				console.log("Server up and ready");
  			}
  		});
    });
  }
