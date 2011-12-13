var mongoose = require('mongoose')
  , Schema   = mongoose.Schema
  , sys         = require('sys')

// The model
var Tweet = new Schema({
    tweetId     : String
  , tweet       : String
  , tweetWords  : [String]
  , postedAt    : { type: Date, index: true }
  , user        : String
  , avatarUrl   : String
  , hashes      : [String]
});

// map function "template" use for time interval counting
// For properly work, {{seconds}} variable needs to be replaced by a real integer
var mapByInterval = function() {  
   var postedDate = new Date(this.postedAt).getTime();
   var startInterval = postedDate - ((postedDate % (seconds * 1000)));
   
   emit(startInterval, 1);
}

// simply emit all tweetWords for word counting
var mapByWord = function() {  
   if (this.tweetWords) {
   	this.tweetWords.forEach(function (word) {
      		emit(word, 1);  
   	});
   } 
}

// counting method for map-reduce, same for all
var reduceFunc = function(key, values) { 
  var count = 0; 
  for (v in values) { 
    count += 1; 
  }
  return count; 
};

// Static methods
Tweet.statics.countKeywords = function (minutes, cb) {
  var endDate = Date.create();
  var startDate = Date.create();
  startDate.rewind({minute : minutes});
  
  // {'inline':1} tell mongo to return result instead of a new collection
  this.collection.mapReduce(mapByWord.toString(), reduceFunc.toString(), { query : { postedAt: { $lte: endDate }, postedAt: { $gte: startDate } }, out :  {'inline':1} }, function (err, val) {
    val = val.sortBy(function(word) {return word.value;}, true);
    cb(err, val.first(20));
  });
}

Tweet.statics.findForDate = function (begin, end, cb) {
  var endDate = Date.create(end);
  var startDate = Date.create(begin);
  
  this
  .where('postedAt').gte(startDate)
  .where('postedAt').lte(endDate)
  .asc('postedAt')
  .run(cb);
}

Tweet.statics.lastByWord = function (word, cb) {
  var endDate = Date.create();
  var startDate = Date.create();
  startDate.rewind({minute : 60});
  
  this
  .where('tweetWords').in([word])
  .where('postedAt').gte(startDate)
  .where('postedAt').lte(endDate)
  .asc('postedAt')
  .run(cb);
}

// statics counting methods
Tweet.statics.countBy10Min = function (minutes, cb) {
  var endDate = Date.create();
  var startDate = Date.create();
  startDate.rewind({minute : minutes});

  this.collection.mapReduce(mapByInterval.toString().replace("seconds",600), reduceFunc.toString(), { query : { postedAt: { $lte: endDate }, postedAt: { $gte: startDate } }, out :  {'inline':1} }, function (err, val) {
    cb(err, val)
  });
}

Tweet.statics.countByHour = function (hour, cb) {
  var endDate = Date.create();
  var startDate = Date.create();
  startDate.rewind({hour : hour});
  
  this.collection.mapReduce(mapByInterval.toString().replace("seconds",3600), reduceFunc.toString(), { query : { postedAt: { $lte: endDate }, postedAt: { $gte: startDate } }, out :  {'inline':1} }, function (err, val) {
    cb(err, val)
  });
}

Tweet.statics.countByDay = function (day, cb) {
  var endDate = Date.create();
  var startDate = Date.create();
  startDate.rewind({day : day});

  this.collection.mapReduce(mapByInterval.toString().replace("seconds",3600 * 24), reduceFunc.toString(), { query : { postedAt: { $lte: endDate }, postedAt: { $gte: startDate } }, out :  {'inline':1} }, function (err, val) {
    cb(err, val)
  });
}

// export Tweet model to other module
exports.Tweet = mongoose.model('Tweet', Tweet);
