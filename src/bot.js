const config = require('./config');
const log = require('./logutils').getLogger('bot');
const _ = require('lodash');
const Twit = require('twit');
const moment = require('moment');
const axios = require('axios');

const T = new Twit(config.twitter);

let lastRetweet = 'n/a';

let collectedRetweets = [];
let ownTwitterAccount;
let friendIds;
let __iterations = 0;

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
const filterAlreadyTweeted = rawTweets =>
  rawTweets.filter(t => !collectedRetweets.map(o => o.id).includes(t.id_str));

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
  const results = await T.get('account/verify_credentials', {
    skip_status: true
  });

  let friendIdList = await T.get('followers/ids', {
    count: 5000,
    stringify_ids: true
  });
  friendIds = friendIdList.data.ids;
  // TODO: work with cursor on followers > 5k
  // let cursor = friendIdList.data.next_cursor_str;
  // while(cursor !== '0') {
  //   friendIdList = await T.get('followers/ids', {count: 50, stringify_ids: true, next_cursor_str: cursor});
  //   friends.concat(friendIdList.data.ids);
  //   cursor = friendIdList.data.next_cursor_str;
  //   console.log(cursor);
  // }
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
  __iterations++;

  const filter = fs.readFileSync(__dirname + '/../filter_rules.json', 'utf-8');

  const filterRules = JSON.parse(filter);
  const tweetsSentInIteration = [];
  const collectNewFriends = [];

  for (let search of filterRules) {
    log.info(`looking for search query >>${JSON.stringify(search)}<<`);
    const tweets = filterAlreadyTweeted(
      await retrieveTweetListByFilter(search)
    );

    for (let tweet of tweets) {
      try {
        if (!search.hasOwnProperty('retweet') || search.retweet) {
          log.debug(tweet.text, {
            user: tweet.user.name,
            tweet_id: tweet.id_str
          });
          await T.post('statuses/retweet/' + tweet.id_str, {});
          tweetsSentInIteration.push({
            text: tweet.text,
            user: tweet.user.name,
            created: tweet.created_at,
            by_filter: search.query.q
          });
          // check, if we also want to auto-like the tweet
          if (search.auto_like) {
            await T.post('favorites/create', {id: tweet.id_str}, {});
          }
          lastRetweet = moment().format('YYYY-MM-DD HH:mm:ss');
        }
        // check, if we want to auto-follow new / yet unknown users
        if (
          search.auto_follow_new_users &&
          !friendIds.includes(tweet.user.id_str)
        ) {
          collectNewFriends.push(tweet.user);
        }
      } catch (err) {
        log.error(`duplicate retweet found`, {tweet_id: tweet.id_str});
      } finally {
        if (!search.hasOwnProperty('retweet') || search.retweet) {
          collectedRetweets.push({
            id: tweet.id_str,
            text: tweet.text,
            user: tweet.user.name,
            retweeted: moment().format('YYYY-MM-DD HH:mm:ss')
          });
        }
      }
    }
    fs.writeFileSync(
      __dirname + '/../tweeted/retweets.json',
      JSON.stringify(collectedRetweets, null, 2)
    );

    // now check, if we wanted to add new friends here
    // based on the filter definition
    //
    // we can have a type "randomized" which picks
    // n-users from the collection list
    //
    // we also can filter out users with a min/max followers criteria
    // so that we only follow users which have a minimum of n-followers
    // and (optional) a maximum amount of m-followers
    //
    // an example filter would look like this
    //
    // {
    //   "query": {
    //   "q": "#bitcoin lang:en",
    //     "count": 50,
    //     "result_type": "recent"
    // },
    //   "filter": "!in_reply",
    //   "auto_follow_new_users": true,
    //   "follow_strategy": {
    //   "type": "random",
    //     "count": 5,
    //     "follower_range": {
    //     "min": 250,
    //       "max": 2500
    //   }
    // },
    //   "retweet": false,
    //   "id": 8
    // }
    //
    // it picks 50 tweets with hashtag #bitcoin from the recent feed
    // filters out in-tweet replies
    // sets auto_follow_new_users to true with the restriction to not retweet
    // the actual post
    // The follow-criteria is of type random which means, pick 5 random users
    // out of the whole list which all have at least 250 followers but a max of 2500
    //
    if (collectNewFriends.length > 0) {
      let filteredFriends = [];
      if (search.hasOwnProperty('follow_strategy')) {
        if (search.follow_strategy.hasOwnProperty('follower_range')) {
          filteredFriends = collectNewFriends.filter(o => {
            const min = search.follow_strategy.follower_range.min || 0;
            const max =
              search.follow_strategy.follower_range.max ||
              Number.MAX_SAFE_INTEGER;
            return o.followers_count > min && o.followers_count < max;
          });
        } else {
          filteredFriends = _.clone(collectNewFriends);
        }
        if (search.follow_strategy.type.startsWith('random')) {
          filteredFriends = _.shuffle(filteredFriends);
          filteredFriends.length = Math.min(
            filteredFriends.length,
            search.follow_strategy.count || 0
          );
        }
      } else {
        filteredFriends = collectNewFriends;
      }

      for (let friend of filteredFriends) {
        await T.post('friendships/create', {
          user_id: friend.id_str,
          follow: true
        });
        log.debug(
          `now following user id >>${friend.name}<< who has ${
            friend.followers_count
          } followers - based on the filter definition ${JSON.stringify(
            search
          )}`
        );
      }
    }
  }

  // in case we configured a webhook to send the results to,
  // send the whole list here
  if (tweetsSentInIteration.length > 0 && config.bot.hooks.sentRetweet.active) {
    await axios.post(config.bot.hooks.sentRetweet.url, tweetsSentInIteration);
  }
};

module.exports.getStatus = detailed => {
  return {
    retweets: detailed ? collectedRetweets : collectedRetweets.length,
    last_retweet: lastRetweet,
    iterations: __iterations
  };
};

module.exports.getOwnTwitterAccount = () => ownTwitterAccount;
