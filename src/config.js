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
    auto_follow_new_users: true,
    hooks: {
      sentRetweet: {
        url: process.env.TWITTERBOT_WEBHOOK_SENT_RETWEET,
        active: !!process.env.TWITTERBOT_WEBHOOK_SENT_RETWEET
      }
    }
  }
};
