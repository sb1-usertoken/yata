// add sugar syntax
require('sugar/lib/sugar.js');
Date.setLocale('fr');

/**
 * Module dependencies.
 */
var express = require('express')
  , routes  = require('./routes')
  , schema  = require('./lib/schema')
  , Poller  = require('./lib/poller')
  , ntwitter = require('ntwitter')
  , mongoose = require('mongoose')
  , config   = require('config') 
  , sys = require('sys')
  , Log = require('log')
  , log = new Log('debug');
  
// configure mongodb
var conf = config.mongodb;
mongoose.connect('mongodb://' + conf.user + ':' + conf.password + '@' + conf.server +'/' + conf.database);

var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);

io.configure('production', function(){
  io.enable('browser client etag');
  io.set('log level', 1);
});

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: '%22kuy45&'}));
  //app.use(express.methodOverride());
  app.use(express.favicon(__dirname + '/public/images/favicon.ico', { maxAge: 2592000000 }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  // Register dynamic helper
  app.dynamicHelpers({
    route: function(req, res){
      return req.route;
    },
    messages: require('express-messages-bootstrap') // not used yet
  });
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  app.use(express.logger('dev'));
  log = new Log('debug');
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
  app.use(express.logger());
});


// configure ntwitter
var conf = config.twitter;
var ntwitter = new ntwitter({
    consumer_key: conf.consumer_key,
    consumer_secret: conf.consumer_secret,
    access_token_key: conf.access_token_key,
    access_token_secret: conf.access_token_secret
});

// configure poller
var poller = Poller.createPoller(ntwitter, config.keywords, config.stopwords);
// each time we have a tweet
poller.on('data', function(data) {
  // we store tweet in database
  tweet = poller.storeTweet(data);
  // we broadcast new tweet to our connected browser
  io.sockets.emit('tweet', tweet.toJSON());
});

// starting polling
poller.startPolling();

// Routes
app.get('/', routes.index);
app.get('/about', routes.about);
app.get('/chart/by/min', routes.chartByMin);
app.get('/chart/by/hour', routes.chartByHour);
app.get('/chart/by/day', routes.chartByDay);
app.get('/lastTweet/:word', routes.lastTweetForWord);
app.get('/tweetByDate/:begin/:end', routes.tweetByDate);
app.get('/top-words/', routes.topWords);

// Start server
app.listen(config.serverport);

var countByMin = [];
var countByHour= [];
var countByDay = [];
var countByKeywords =[] ;

// Refresh counts

var refreshCountMin = function () { 
  log.debug("Refreshing countByMin data");
  schema.Tweet.countBy10Min(60*24, function (err, res) {this.countByMin = res;});
};
var refreshCountHour = function () { 
  log.debug("Refreshing countByHour data");
  schema.Tweet.countByHour(48, function (err, res) {this.countByHour = res;}); 
};
var refreshCountDay = function () { 
  log.debug("Refreshing countByDay data");
  schema.Tweet.countByDay(20, function (err, res) {this.countByDay = res;});
};
var refreshKeywords = function () { 
  log.debug("Refreshing keywords data");
  schema.Tweet.countKeywords(60, function (err, res) {
    if (err === null) {
      this.countByKeywords = res;
    }
    else
    {
      log.error('refreshKeywords error %s', err);
      this.countByKeywords = [];
    }
  });
};
refreshCountMin();
refreshCountHour();
refreshCountDay();
refreshKeywords();

setInterval(refreshKeywords, 10 * 1000);
setInterval(refreshCountMin, 20 * 1000);
setInterval(refreshCountHour, 120 * 1000);
setInterval(refreshCountDay, 3600 * 1000);

setInterval(function () {poller.restart()}, 600 * 1000);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);