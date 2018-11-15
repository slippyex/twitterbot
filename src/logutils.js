/*global module, require, __dirname*/
const config = require('./config');
const logConfig = {
  streams: []
};
const bunyan = require('bunyan');
const PrettyStream = require('bunyan-prettystream');
const availableLevels = ['info', 'debug', 'warn', 'error', 'trace'];
const prettyStdOut = new PrettyStream();

prettyStdOut.pipe(process.stdout);

logConfig.streams.push({
  type: 'raw',
  level: config.logLevel,
  stream: prettyStdOut
});

const getLogger = (name, additionalFields) => {
  const mandatory = {
    name: name
  };

  const logConf = Object.assign(mandatory, logConfig, additionalFields || {});
  const logger = bunyan.createLogger(logConf);

  const logFunc = {};
  for (let level of availableLevels) {
    logFunc[level] = (msg, extras = {}) => logger[level]({...extras}, msg);
  }

  return logFunc;
};
module.exports.getLogger = getLogger;
