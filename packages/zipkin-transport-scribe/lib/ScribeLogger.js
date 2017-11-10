'use strict';

/* eslint-disable no-console */
var _require = require('scribe'),
    Scribe = _require.Scribe;

var _require2 = require('base64-js'),
    base64encode = _require2.fromByteArray;

var THRIFT = require('zipkin-encoder-thrift');

function ScribeLogger(_ref) {
  var _this = this;

  var scribeHost = _ref.scribeHost,
      _ref$scribePort = _ref.scribePort,
      scribePort = _ref$scribePort === undefined ? 9410 : _ref$scribePort,
      _ref$scribeInterval = _ref.scribeInterval,
      scribeInterval = _ref$scribeInterval === undefined ? 1000 : _ref$scribeInterval;

  var scribeClient = new Scribe(scribeHost, scribePort, { autoReconnect: true });
  scribeClient.on('error', function () {});

  this.queue = [];

  setInterval(function () {
    if (_this.queue.length > 0) {
      try {
        scribeClient.open(function (err) {
          if (err) {
            console.error('Error writing Zipkin data to Scribe', err);
          } else {
            _this.queue.forEach(function (span) {
              scribeClient.send('zipkin', base64encode(THRIFT.encode(span)));
            });
            scribeClient.flush();
            _this.queue.length = 0;
          }
        });
      } catch (err) {
        console.error('Error writing Zipkin data to Scribe', err);
      }
    }
  }, scribeInterval);
}
ScribeLogger.prototype.logSpan = function logSpan(span) {
  this.queue.push(span);
};

module.exports = ScribeLogger;