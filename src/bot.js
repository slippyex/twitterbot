const config = require('./config');
const log = require('./logutils').getLogger('bot');
const _ = require('lodash');
const Twit = require('twit');
const moment = require('moment');

const T = new Twit(config.twitter);

let lastRetweet = 'n/a';

let collectedRetweets = [];
let ownTwitterAccount;

const fs = require('fs');

/**
 * retrieves a list of tweets based on a given search query
 * and a possible extra filter condition
 *
 * @param search
 * @returns {Promise<Array>}
 */
const retrieveTweetListByFilter = async search => {
  if (!search || !search.hasOwnProperty('query')) {
    throw new Error('no search query provided or in wrong format');
  } else {
    const envelope = await T.get('search/tweets', search.query);
    let rawTweets = _.uniqBy(envelope.data.statuses, 'text');
    rawTweets = rawTweets.filter(o => o.user.id_str !== ownTwitterAccount);
    return search.filter !== '!in_reply'
      ? rawTweets
      : rawTweets.filter(
          o => !o.in_reply_to_status_id && !o.in_reply_to_user_id
        );
  }
};

/**
 * filters out already retweeted tweets
 *
 * @param rawTweets
 * @returns {*}
 */
const filterAlreadyTweeted = rawTweets => {
  const retweetedIds = collectedRetweets.map(o => o.id);
  return rawTweets.filter(t => !retweetedIds.includes(t.id_str));
};

/**
 * enables testing of new filter rules without initiating a retweet
 *
 * @param filter
 * @returns {Promise<Array>}
 */
module.exports.testFilter = async filter => {
  return await retrieveTweetListByFilter(filter);
};

/**
 * registers own user into context to filter out
 * all tweets/retweets by myself
 *
 * @returns {Promise<void>}
 */
module.exports.registerOwnUser = async () => {
  const results = await T.get('account/verify_credentials', { skip_status: true });
  ownTwitterAccount = results.data.id_str;
};

/**
 * iterates through list of filters and retweets
 * new tweets
 *
 * @returns {Promise<void>}
 */
module.exports.retweetLatest = async () => {
  try {
    collectedRetweets = JSON.parse(
      fs.readFileSync(__dirname + '/../tweeted/retweets.json', 'utf8')
    );
  } catch (err) {
    log.info('first time start - no retweets.json found yet');
    collectedRetweets = [];
  }
  global.iterations++;

  const filter = fs.readFileSync(__dirname + '/../filter_rules.json', 'utf-8');

  const filterRules = JSON.parse(filter);

  for (let search of filterRules) {
    log.info(`looking for search query >>${JSON.stringify(search)}<<`);
    const tweets = filterAlreadyTweeted(
      await retrieveTweetListByFilter(search)
    );

    for (let tweet of tweets) {
      log.debug(tweet.text, {tweet_id: tweet.id_str});
      try {
        await T.post('statuses/retweet/' + tweet.id_str, {});
        lastRetweet = moment().format('YYYY-MM-DD HH:mm:ss');
      } catch (err) {
        log.error(`duplicate retweet found`, {tweet_id: tweet.id_str});
      } finally {
        collectedRetweets.push({
          id: tweet.id_str,
          text: tweet.text,
          user: tweet.user.name,
          retweeted: moment().format('YYYY-MM-DD HH:mm:ss')
        });
      }
    }
    fs.writeFileSync(
      __dirname + '/../tweeted/retweets.json',
      JSON.stringify(collectedRetweets, null, 2)
    );
  }
};

module.exports.collectedRetweets = () => collectedRetweets;
module.exports.getOwnTwitterAccount = () => ownTwitterAccount;
module.exports.getLastRetweet = () => lastRetweet;