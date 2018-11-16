require('dotenv').config();
const express = require('express');
const fs = require('fs');

const config = require('./src/config');
const bot = require('./src/bot');
const log = require('./src/logutils').getLogger('main');
const utils = require('./src/utils');
const bodyParser = require('body-parser');
const _ = require('lodash');

const getFilters = () => {
  const filter = fs.readFileSync(__dirname + '/filter_rules.json', 'utf-8');
  return JSON.parse(filter);
};

const setFilters = filterRules => {
  fs.writeFileSync(
    __dirname + '/filter_rules.json',
    JSON.stringify(filterRules, null, 2)
  );
};

const app = express();
global.iterations = 0;

app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

app.get('/', (req, res) => {
  res.status(200).json({status: 'ok'});
});

app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    retweets: bot.collectedRetweets(),
    uptime: utils.format(process.uptime()),
    iterations: global.iterations,
    last_retweet: bot.getLastRetweet()
  });
});

app.get('/filters', (req, res) => {
  try {
    const filter = fs.readFileSync(__dirname + '/filter_rules.json', 'utf-8');
    const filterRules = JSON.parse(filter);
    res.status(200).json(filterRules);
  } catch (err) {
    log.error('filter could not be read', err);
  }
});

app.delete('/filters/:id', async (req, res) => {
  let filters = getFilters();
  filters = _.filter(filters, o => o.id !== Number.parseInt(req.params.id));
  setFilters(filters);
  res.status(200).json(filters);
});

app.post('/filters', async (req, res) => {
  if (req.query.test) {
    const results = await bot.testFilter(req.body);
    const mapped = results.map(o => {
      return {id: o.id_str, text: o.text, user: o.user.name};
    });
    res.status(200).json(mapped);
  } else {
    let filterRules = getFilters();
    const newFilter = _.clone(req.body);
    newFilter.id = Math.max.apply(Math, filterRules.map(o => o.id)) + 1;
    filterRules.push(newFilter);
    filterRules = _.uniqBy(filterRules, 'query.q');
    setFilters(filterRules);
    res.status(200).json(filterRules);
  }
});

app.listen(config.bot.port, async function() {

  // get own user account to filter out tweets from myself
  await bot.registerOwnUser();

  // initate the first retweet-iteration directly upon start
  await bot.retweetLatest();
  log.debug(`SLiPPY's twitter bot listening on port ${config.bot.port}`);
});

setInterval(bot.retweetLatest, config.bot.frequency);
