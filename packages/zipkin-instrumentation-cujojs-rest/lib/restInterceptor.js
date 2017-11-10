'use strict';

/* eslint-disable no-param-reassign */
var interceptor = require('rest/interceptor');

var _require = require('zipkin'),
    Instrumentation = _require.Instrumentation;

function getRequestMethod(req) {
  var method = 'get';
  if (req.entity) {
    method = 'post';
  }
  if (req.method) {
    method = req.method;
  }
  return method;
}

function request(req, _ref) {
  var _this = this;

  var tracer = _ref.tracer,
      _ref$serviceName = _ref.serviceName,
      serviceName = _ref$serviceName === undefined ? 'unknown' : _ref$serviceName,
      remoteServiceName = _ref.remoteServiceName;

  this.instrumentation = new Instrumentation.HttpClient({ tracer: tracer, serviceName: serviceName, remoteServiceName: remoteServiceName });
  return tracer.scoped(function () {
    var reqWithHeaders = _this.instrumentation.recordRequest(req, req.path, getRequestMethod(req));
    _this.traceId = tracer.id;
    return reqWithHeaders;
  });
}

function response(res, _ref2) {
  var _this2 = this;

  var tracer = _ref2.tracer;

  tracer.scoped(function () {
    _this2.instrumentation.recordResponse(_this2.traceId, res.status.code);
  });
  return res;
}

module.exports = interceptor({
  request: request,
  response: response
});