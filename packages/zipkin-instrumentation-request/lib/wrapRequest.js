'use strict';

var _require = require('zipkin'),
    Instrumentation = _require.Instrumentation;

function wrapRequest(request, _ref) {
  var tracer = _ref.tracer,
      _ref$serviceName = _ref.serviceName,
      serviceName = _ref$serviceName === undefined ? 'unknown' : _ref$serviceName,
      remoteServiceName = _ref.remoteServiceName;

  var instrumentation = new Instrumentation.HttpClient({ tracer: tracer, serviceName: serviceName, remoteServiceName: remoteServiceName });
  return request.defaults(function (options, callback) {
    return tracer.scoped(function () {
      var method = options.method || 'GET';
      var url = options.uri || options.url;
      var wrappedOptions = instrumentation.recordRequest(options, url, method);
      var traceId = tracer.id;

      var recordResponse = function recordResponse(response) {
        instrumentation.recordResponse(traceId, response.statusCode);
      };

      var recordError = function recordError(error) {
        instrumentation.recordError(traceId, error);
      };

      return request(wrappedOptions, callback).on('response', recordResponse).on('error', recordError);
    });
  });
}

module.exports = wrapRequest;