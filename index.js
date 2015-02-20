// ### Libraries and globals

// This bot works by inspecting the front page of Google News. So we need
// to use `request` to make HTTP requests, `cheerio` to parse the page using
// a jQuery-like API, `underscore.deferred` for [promises](http://otaqui.com/blog/1637/introducing-javascript-promises-aka-futures-in-google-chrome-canary/),
// and `twit` as our Twitter API library.
var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore.deferred');
var config = require('./config.js');
var Twit = require('twit');
var T = new Twit(config);
var nlp = require('nlp_compromise');

var baseUrl = 'http://news.google.com';


// ### Utility Functions

var logger = function(msg) {
    if (config.log) console.log(msg);
};


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

var getGoatWord = function() {

  // TODO: nice to rank these, somehow....
  var goats = [
    'goat',
    'goat',
    'goat',
    'goat',
    'goat',
    'goat',
    'goat',
    'goat',
    'goat',
    'goat',
    'goat',
    'goat',
    'capra aegagrus hircus',
    'wild goat',
    'domestic goat',
    'capra aegagrus hircus',
    'wild goat',
    'domestic goat',
    'capra aegagrus hircus',
    'wild goat',
    'domestic goat',
    'caprinae',
    'doe',
    'nanny',
    'buck',
    'billy',
    'ram',
    'kid',
    'wether',
    'modern Ibex',
    'small livestock animal',
    'dung-producer',
    'dung',
    'zodiac beast',
    'zodiac animal',,
    'bearded animal',
    'bearded beast',
    'noble beast',
    'mohair',
    'mohair provider',
    'feta source',
    'toga (anagram)',
    'grass',
    'tin cans',
    'horn',
    'nimble mountain animal',
    'mountain dweller',
    'shears'
  ];

  return pick(goats);

};

var isFirstLetterUpperCase = function(str) {
  return (str.charAt(0).toUpperCase() == str.charAt(0));
};

var capitalize = function(phrase) {

  var cphrase = [];
  var splits = phrase.split(' ');
  for (var i = 0; i < splits.length; i++) {
    cphrase.push(capitalizeWord(splits[i]));
  }

  return cphrase.join(' ');

};

var capitalizeWord = function(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
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
  logger('url: ' + url);
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

// TODO: replace these original notes with ones that make more sense
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
    logger('topic:');
    logger(topic);

    getHeadline(topic.url).then(function(headline) {
      logger('headline: ' + headline);

      try {
        // for goats, only need one headline
        var nouns = getNNarray(headline);

        var noun = pickRemove(nouns);
        var goat = getGoatWord();

        console.log('noun: ' + noun);
        console.log('goat: ' + goat);

        if (isFirstLetterUpperCase(noun)){
          goat = capitalize(goat);
          console.log('Goat: ' + goat);
        }

        var goatHeadline = headline.replace(noun, goat);
        // every now and then, we get an "undefined" for the replaced word
        // is it getGoatWord() or capitalize?

        // uh.... WHAT'S THAT INTERMEDIATE LINE ?!?!?!

        // 2015-02-20T10:32:08.020441+00:00 app[worker.1]: old: 'Skunk-like' cannabis link to quarter of psychosis cases
        // 2015-02-20T10:32:08.182428+00:00 app[worker.1]:   id_str: '568719744771227648',
        // 2015-02-20T10:32:08.020514+00:00 app[worker.1]: new: 'Skunk-like' cannabis link to undefined of psychosis cases

        console.log('old: ' + headline);
        console.log('new: ' + goatHeadline);

        // would a different lib do better?
        // 09:16:58 worker.1 | noun: Oregon Governor Says He Will Resign
        // 09:16:58 worker.1 | goat: kid
        // 09:16:58 worker.1 | Goat: Kid
        // 09:16:58 worker.1 | old: Embattled Oregon Governor Says He Will Resign
        // 09:16:58 worker.1 | new: Embattled Kid

        // 09:19:48 worker.1 | noun: Rec Writer Harris Wittels Found Dead of Apparent Overdose
        // 09:19:48 worker.1 | goat: zodiac beast
        // 09:19:48 worker.1 | Goat: Zodiac beast
        // 09:19:48 worker.1 | old: Parks and Rec Writer Harris Wittels Found Dead of Apparent Overdose
        // 09:19:48 worker.1 | new: Parks and Zodiac beast

        if (config.tweet_on) {
          T.post('statuses/update', { status: goatHeadline }, function(err, reply) {
          if (err) {
              console.log('error:', err);
            }
          else {
              logger('tweet success');
            }
        });
        }
      } catch(ex) {
        console.log(ex);
      }

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
  catch (ex) {
    console.log(ex);
  }
}, 1000 * config.minutes * config.seconds);
