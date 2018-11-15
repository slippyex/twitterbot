require('dotenv').config();
const express = require('express');
const fs = require('fs');

const config = require('./src/config');
const bot = require('./src/bot');
const log = require('./src/logutils').getLogger('main');
const utils = require('./src/utils');

const app = express();
global.iterations = 0;

try {
  bot.collectedRetweets = JSON.parse(
    fs.readFileSync(__dirname + '/tweeted/retweets.json', 'utf8')
  );
} catch (err) {
  log.info('first time start - no retweeted.json found yet');
  bot.collectedRetweets = [];
}

app.get('/', (req, res) => {
  res.status(200).json({status: 'ok'});
});

app.get('/status', (req, res) => {
  res.status(200).json(
    {
      status: 'ok',
      retweets: bot.collectedRetweets,
      uptime: utils.format(process.uptime()),
      iterations: global.iterations
    }
  );
});

app.listen(config.bot.port, async function() {
  await bot.retweetLatest();
  log.debug(`SLiPPY's twitter bot listening on port ${config.bot.port}`);
});



setInterval(bot.retweetLatest, config.bot.frequency);
