var schema  = require('./../lib/schema'),
    sys = require('sys');

// Dynamics URL 
exports.index = function(req, res){
  
  var query = schema.Tweet.find({}).sort('postedAt', -1).limit(10);
  var keywords = this.countByKeywords;
  
  query.exec({}, function (err, docs) {
    res.render('index', { tweetkeywords : keywords
                        , tweets: docs.reverse()
                        , keywords: process.env.npm_package_config_keywords.split(',')
                        });
  });
};

// Show last tweet
exports.lastTweetForWord = function(req, res){
  schema.Tweet.lastByWord(req.params.word, function (err, doc) {
    res.render('tweets', { layout: false, tweets : doc });
  });
};

// Show last tweet
exports.tweetByDate = function(req, res){
  schema.Tweet.findForDate(req.params.begin, req.params.end, function (err, doc) {
    res.render('tweets', {layout: false, tweets : doc });
  });
};

// top words
exports.topWords = function(req, res){
  res.render('partial/top-words', {layout: false, tweetkeywords : this.countByKeywords});
};

// Expose Chart Tools Datasource Protocol
// see http://code.google.com/apis/chart/interactive/docs/dev/implementing_data_source.html#jsondatatable
exports.chartByMin = function(req, res){
  var reqId = req.query.tqx.split(':').pop();
  res.render('chart-data', {layout: false, date_format: "{HH}h{mm}", data : this.countByMin, tqx : reqId});
};

exports.chartByHour = function(req, res){
  var reqId = req.query.tqx.split(':').pop();
  res.render('chart-data', {layout: false, date_format: "{dow}. {HH}h", data : this.countByHour, tqx : reqId});
};

exports.chartByDay = function(req, res){
  var reqId = req.query.tqx.split(':').pop();
  res.render('chart-data', {layout: false, date_format: "{dow}. {d}/{M}", data : this.countByDay, tqx : reqId});
};


