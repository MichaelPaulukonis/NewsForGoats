# @NewsForGoats

A Twitter bot that looks at news headlines and makes sure that goats would be interested.


## Documentation
Maybe.

Based on Darius Kazeimi's [Two Headlines bot](https://github.com/dariusk/twoheadlines).


## See Also
More of my [Twitter Bots](http://www.xradiograph.com/WordSalad.TwitterBotProject).

Some of my [web art](http://www.xradiograph.com/PrantedMutter/Sketch).


##Instructions

Requires [node](http://nodejs.org/) and [npm](http://npmjs.org/) (installing node installs npm too). You also need a Twitter App access token, consumer key, and associated secrets. [You can get those here](https://dev.twitter.com/apps/new). You'll probably also want a fresh twitter account for your bot, though you could have it post to one you already own, too!

Clone the repo, then in your project directory, install the dependencies:

`$ npm install`

Next, edit `config.js` to include your Twitter App access token, consumer key, and associated secrets. This is important! Without this you'll be unable to tweet.

Install/run `grunt` to lint your code and run `docco` to regenerate the documentation.

`$ npm install -g grunt-cli`
`$ grunt`

You can also run a watch in the background:

`$ grunt watch`

To actually run the bot, do:

`$ node index.js`

This will give you some output, including, after a bit, a bunch of text that is the tweet that's just been tweeted. You can check the twitter account to see if it's updated to verify that it actually works.


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).


## License
Copyright (c) 2015 Michael Paulukonis
Licensed under the MIT license.
