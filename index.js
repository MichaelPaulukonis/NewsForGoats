// ### Libraries and globals

// This bot works by inspecting the front page of Google News. So we need
// to use `request` to make HTTP requests, `cheerio` to parse the page using
// a jQuery-like API, `underscore.deferred` for [promises](http://otaqui.com/blog/1637/introducing-javascript-promises-aka-futures-in-google-chrome-canary/),
// and `twit` as our Twitter API library.
var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore.deferred');
var Twit = require('twit');
var T = new Twit(require('./config.js'));
var nlp = require('nlp_compromise');

var baseUrl = 'http://news.google.com';


// TODO: look at huffingboingboing bot for better handling of config elements
// with regards to git and heroku

// ### Utility Functions

// adding to array.prototype caused issues with nlp_compromise
// get random element from array
var pick = function(arr) {
  return arr[Math.floor(Math.random()*arr.length)];
};

// get a random element from an array
// then remove that element so we can't get it again.
var pickRemove = function(arr) {
  var index = Math.floor(Math.random()*arr.length);
  return arr.splice(index,1)[0];
};


var getRandom = function(min,max) {
  return Math.floor(Math.random() * (max - min) + min);
};

var stripWord = function(word) {

  // let punctuation and possessives remain
  // TODO: unit-tests for various errors we encounter
  // Venice's := Venice
  // VENICE'S := VENICE
  // etc.
  var removals = ['"', ':', '-', ',', '\'s$', '\\(', '\\)', '\\[', '\\]' ];

  for (var i = 0 ; i < removals.length; i++) {
    var r = removals[i];
    word = word.replace(new RegExp(r, 'i'), '');
  }

  return word;
};


var getNNarray = function(headline) {

  var nn = [];
  var nouns = nlp.pos(headline).nouns();

  for (var i = 0; i < nouns.length; i++) {
    var t = nouns[i];
    if (t.pos.tag === 'NN') {
      nn.push(stripWord(t.text));
    }
  }

  return nn;

};

// ### Screen Scraping

// We pass this function a category code (see `tweet` below). We grab the Google News
// topics page for that category and load the html into `cheerio`. We parse the page for
// text from the links in the left-hand bar, which becomes a list of topics.
// For example, if we passed it 'e' for Entertainment, we might get: Miley Cyrus, Oscars,
// Kanye West, and so on.
function getTopics(category) {
  var topics = [];
  var dfd = new _.Deferred();
  var url = baseUrl + '/news/section?ned=us&topic=' + category;
  console.log('url: ' + url);
  request(url, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var $ = cheerio.load(body);
      $('.esc-topic-link').each(function() {
        var topic = {};
        // clean up name: ' Kaspersky Lab »\r\n'
        var nbspre = '/(\xC2\xA0/|&nbsp;)';
        var rdaqre = /\xBB/g; // remove right-double-angled-quote
        topic.name = this.text().replace(nbspre, '').replace('/r/n', '').replace(rdaqre, '').trim();
        topic.url = baseUrl + this.attr('href');
        topics.push(topic);
      });
      dfd.resolve(topics);
    }
    else {
      dfd.reject();
    }
  });
  // The function returns a promise, and the promise resolves to the array of topics.
  return dfd.promise();
}

// We pass this function a URL for a specific topic (for example:
// [Miley Cyrus](https://news.google.com/news/section?pz=1&cf=all&ned=us&hl=en&q=Miley%20Cyrus).
// We then get the page, feed the HTML to `cheerio`, and then pick a random headline
// from the page.
function getHeadline(url) {
  var dfd = new _.Deferred();
  request(url, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var $ = cheerio.load(body);
      var headlines = $('.titletext');
      // `pick()` doesn't work here because `headlines` isn't an array, so instead we use `cheerio`'s `eq` which
      // give us a matched element at a given index, and pass it a random number.
      var headline = headlines.eq(Math.floor(Math.random()*headlines.length)).text();
      dfd.resolve(headline);
    }
    else {
      dfd.reject();
    }
  });
  return dfd.promise();
}

// ### Tweeting

//      Category codes:
//      w:  world
//      n:  region
//      b:  business
//      tc: technology
//      e:  entertainment
//      s:  sports

// This is the core function that is called on a timer that initiates the @twoheadlines algorithm.
// First, we get our list of topics from the Google News sidebar.
// Then we pick-and-remove a random topic from that list.
// Next we grab a random headline available for that topic.
// If the topic itself is in the headline itself, we replace it with a new topic. (For example,
// if `topic.name` is "Miley Cyrus" and `headline` is "Miley Cyrus Wins a Grammy", then we
// get a topic from a different category of news and fill in the blank for "______ Wins a Grammy".)
// If we're unable to find a headline where we can easily find/replace, we simply try again.
function tweet() {
  var categoryCodes = ['w', 'n', 'b', 'tc', 'e', 's'];
  getTopics(pickRemove(categoryCodes)).then(function(topics) {
    var topic = pickRemove(topics);
    console.log('topic:');
    console.log(topic);
    getHeadline(topic.url).then(function(headline) {
      console.log('headline: ' + headline);
      // replace spaces in name with plus-sign
      // s/b case-insensitive match

      try {
        // for goats, only need one headline
        var nouns = getNNarray(headline);

        var noun = pickRemove(nouns);

        var goatHeadline = headline.replace(noun, 'goat');

        console.log('old: ' + headline);
        console.log('new: ' + goatHeadline);
      } catch(ex) {
        console.log(ex);
      }

      // if (headline.toLowerCase().indexOf(topic.name.toLowerCase()) > -1) {
      //   getTopics(pickRemove(categoryCodes)).then(function(topics) {
      //     var newTopic = pick(topics);
      //     console.log('newtopic: ' + newTopic);
      //     console.log(newTopic);
      //     // s/b case-insensitve matche
      //     var nameRe = new RegExp(topic.name, 'gi');
      //     var newHeadline = headline.replace(nameRe, newTopic.name);
      //     console.log('orig: ' + headline + '\nnew: ' + newHeadline);
      //     // T.post('statuses/update', { status: newHeadline }, function(err, reply) {
      //     //   if (err) {
      //     //     console.log('error:', err);
      //     //   }
      //     //   else {
      //     //     console.log('reply:', reply);
      //     //   }
      //     // });
      //   });
      // }
      // else {
      //   console.log('couldn\'t find a headline match, trying again...');
      //   tweet();
      // }


    });
  });
}

// Tweets once on initialization.
tweet();


// Tweets every n minutes
// set config.seconds to 60 for a complete minute
setInterval(function () {
  try {
    tweet();
  }
  catch (e) {
    console.log(e);
  }
}, 1000 * config.minutes * config.seconds);
