// Put your own Twitter App keys here. See README.md for more detail.
// if you see 'process.env.SOMETHING' that means it's a heroku environment variable
// heroku plugins:install https://github.com/ddollar/heroku-config.git
// and will only work with 'foreman start worker'
module.exports = {

    // 4 keys used by TWIT
    consumer_key:         process.env.CONSUMER_KEY,
    consumer_secret:      process.env.CONSUMER_SECRET,
    access_token:         process.env.ACCESS_TOKEN,
    access_token_secret:  process.env.ACCESS_TOKEN_SECRET,

    // pull headlines from static file, or live
    static_source:        (process.env.STATIC_LIB.toLowerCase() === 'true'),
    tweet_on:             (process.env.TWEET_ON.toLowerCase() === 'true'),
    log:                  (process.env.LOG.toLowerCase() === 'true'),
    // set config.seconds to 60 for a complete minute
    seconds:              parseInt(process.env.SECONDS, 10),
    minutes:              parseInt(process.env.MINUTES, 10)
};
