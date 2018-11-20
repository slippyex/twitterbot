# SLiPPY's twitterbot

Launches a bot, which retweets relevant postings based on a given configuration

To get it running, either create a `.env` file in the root of this source folder

with the following information

or provide the below environment variables

* TWITTER_CONSUMER_KEY
* TWITTER_CONSUMER_SECRET
* TWITTER_ACCESS_TOKEN
* TWITTER_TOKEN_SECRET

You can also refer to `.env_example` and simply copy it over to `.env`

Furthermore you have to have a set of filter rules defined. As an example you can copy `filter_rules_example.json` 
to `filter_rules.json` and define your own search criteria based on the Twitter API search definitions

Once everything is set up, you can fire your copy of the twitter bot by simply calling `npm start`

In case you want to run it as a background service, I suggest that you look into the `forever` package.

## Prerequisites

You need to apply for a developer account on twitter and create an application to 
retrieve the above required keys.

## Getting started

1. Clone this repository `git clone https://github.com/slippyex/twitterbot.git && cd twitterbot`
2. Install required depencies with `npm install`
3. add the required environment variables as shown above
4. copy `filter_rules_example.json` to `filter_rules.json`
5. start the bot by `npm start`
6. check out the REST interface on `http://localhost:5555/status`

