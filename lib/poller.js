
var ntwitter = require('ntwitter'),
    events   = require('events'),
    util     = require('util'),
    schema   = require('./schema');

// Override http/https to use proxy environment variables
require('./proxy');

function Poller(ntwitter, keywords, stopwords) {
  events.EventEmitter.call(this);
  this.ntwitter = ntwitter;
  this.keywords = keywords;
  this.stopwords = stopwords;
}

util.inherits(Poller, events.EventEmitter);
  
Poller.prototype.storeTweet = function (tweet) {
  var t = new schema.Tweet();
  t.tweetId = tweet.id_str;
  t.tweet = tweet.text;
  
  var self = this; 
  var tweetWords = tweet.text.words().exclude(function(word) {
            // remove URL, following hashtag or commons words
            return word.length == 1 || word.startsWith('http://') || self.keywords.indexOf(word.toLowerCase()) > 0 || self.stopwords.indexOf(word.toLowerCase()) > 0; 
      });
  t.tweetWords = tweetWords;
  t.postedAt = tweet.created_at;
  t.user = tweet.user;
  t.avatarUrl = tweet.user.profile_image_url;
  t.hashes = []; // TODO
  
  t.save(function (err) {
    if (err) sys.puts("ERR: " + sys.inspect(err));
  });
  
  return t;
}
  
Poller.prototype.startPolling = function() {
  var self = this;

  this.ntwitter.stream('statuses/filter', { track: this.keywords.join(',') }, function(stream) {
    stream.on('data', function (data) {
      self.emit('tweet', data);
    });

    stream.on('error', function (data) {
      console.log("Stream error " + util.inspect(data));
    });

    stream.on('end', function (data) {
      console.log("Stream ended: " + util.inspect(data));
    });

    self.currentStream = stream;
  });

  console.log('Start twitter stream on ' + this.keywords.map(function(keyword) { return String(keyword); }));
};

Poller.prototype.stopPolling = function() {
  this.currentStream.destroy();
};

Poller.prototype.restart = function() {
  this.stopPolling();
  this.statrPolling();
}

exports.createPoller = function(ntwitter, keywords, stopwords) {
  return new Poller(ntwitter, keywords, stopwords);
}
