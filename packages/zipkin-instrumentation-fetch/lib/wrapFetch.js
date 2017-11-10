'use strict';

var _require = require('zipkin'),
    Instrumentation = _require.Instrumentation;

function wrapFetch(fetch, _ref) {
  var tracer = _ref.tracer,
      _ref$serviceName = _ref.serviceName,
      serviceName = _ref$serviceName === undefined ? 'unknown' : _ref$serviceName,
      remoteServiceName = _ref.remoteServiceName;

  var instrumentation = new Instrumentation.HttpClient({ tracer: tracer, serviceName: serviceName, remoteServiceName: remoteServiceName });
  return function zipkinfetch(url) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    return new Promise(function (resolve, reject) {
      tracer.scoped(function () {
        var method = opts.method || 'GET';
        var zipkinOpts = instrumentation.recordRequest(opts, url, method);
        var traceId = tracer.id;

        fetch(url, zipkinOpts).then(function (res) {
          tracer.scoped(function () {
            instrumentation.recordResponse(traceId, res.status);
          });
          resolve(res);
        }).catch(function (err) {
          tracer.scoped(function () {
            instrumentation.recordError(traceId, err);
          });
          reject(err);
        });
      });
    });
  };
}

module.exports = wrapFetch;