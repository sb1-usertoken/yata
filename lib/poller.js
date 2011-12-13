var TwitterNode = require('twitter-node').TwitterNode
  , sys         = require('sys')
  , schema      = require('./schema')
  , events = require('events')
  , util = require('util');


function Poller(twitterNode, keywords, stopwords) {
  events.EventEmitter.call(this);
  this.twitterNode = twitterNode;
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


Poller.prototype.restart = function() {
  this.twitterNode.stream();
}
  
Poller.prototype.startPolling = function() {

  this.twitterNode.track(this.keywords);

  this.twitterNode.addListener('error', function(error) {
    sys.puts("ERROR: " + sys.inspect(error));
  });

  var self = this;
  this.twitterNode.addListener('tweet', function(tweet) {
      self.emit('data', tweet);
    });

  this.twitterNode.addListener('limit', function(limit) {
      sys.puts("LIMIT: " + sys.inspect(limit));
    });

  this.twitterNode.addListener('delete', function(del) {
      sys.puts("DELETE: " + sys.inspect(del));
    });

  this.twitterNode.addListener('end', function(resp) {
      sys.puts("wave goodbye... " + resp.statusCode);
      this.twitterNode.stream();
    });

  sys.puts('start twitter stream on ' + sys.inspect(this.keywords));
  this.twitterNode.stream();
}

exports.createPoller = function(twitterNode, keywords, stopwords) {
  return new Poller(twitterNode, keywords, stopwords);
}
