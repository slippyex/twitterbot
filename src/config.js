module.exports = {
  twitter: {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_TOKEN_SECRET
  },
  logLevel: 'debug',
  bot: {
    port: 5555,
    frequency: 1000 * 60 * 15,
    search_list: [
      {
        query: {
          q: 'from:doc__com lang:en -filter:retweets',
          count: 50,
          result_type: 'recent'
        },
        filter: '!in_reply'
      },
      {
        query: {
          q: 'from:EristicaApp lang:en -filter:retweets',
          count: 50,
          result_type: 'recent'
        },
        filter: '!in_reply'
      },
      {
        query: {
          q: '#eristica lang:en -filter:retweets',
          count: 50,
          result_type: 'recent'
        },
        filter: '!in_reply'
      }
    ]
  }
};
