const config = require('./config');
const log = require('./logutils').getLogger('bot');
const _ = require('lodash');
const Twit = require('twit');
const T = new Twit(config.twitter);
const collectedRetweets = [];
const fs = require('fs');

const retweetLatest = async () => {
  try {
    for (let search of config.bot.search_list) {
      const envelope = await T.get('search/tweets', search.query);
      let tweets = _.uniqBy(envelope.data.statuses, 'text');

      if (search.filter === '!in_reply')
        tweets = tweets.filter(
          o => !o.in_reply_to_status_id && !o.in_reply_to_user_id
        );

      // filter out tweets which I already retweeted
      tweets = tweets.filter(o => o.retweet_count === 0);

      for (let tweet of tweets) {
        log.debug(tweet.text);
        const retweetId = tweet.id_str;
        try {
          collectedRetweets.push(
            await T.post('statuses/retweet/' + retweetId, {}, tweeted)
          );
        } catch (err) {
          log.error(err);
        }
      }
      fs.writeFileSync(
        __dirname + '/../tweeted/retweets.json',
        JSON.stringify(collectedRetweets, null, 2)
      );
    }
  } catch (err) {
    log.error('There was an error with your search criteria:', err);
  }
};

const tweeted = (err, reply) => {
  if (err !== undefined) {
    log.error(err);
  } else {
    log.debug('Tweeted:', JSON.stringify(reply, null, 2));
  }
};

module.exports.retweetLatest = retweetLatest;
module.exports.collectedRetweets = collectedRetweets;
