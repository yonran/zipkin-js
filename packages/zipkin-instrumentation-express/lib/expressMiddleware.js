'use strict';

var _require = require('zipkin'),
    _require$option = _require.option,
    Some = _require$option.Some,
    None = _require$option.None,
    Instrumentation = _require.Instrumentation;

var url = require('url');

function formatRequestUrl(req) {
  var parsed = url.parse(req.originalUrl);
  return url.format({
    protocol: req.protocol,
    host: req.get('host'),
    pathname: parsed.pathname,
    search: parsed.search
  });
}

module.exports = function expressMiddleware(_ref) {
  var tracer = _ref.tracer,
      _ref$serviceName = _ref.serviceName,
      serviceName = _ref$serviceName === undefined ? 'unknown' : _ref$serviceName,
      _ref$port = _ref.port,
      port = _ref$port === undefined ? 0 : _ref$port;

  var instrumentation = new Instrumentation.HttpServer({ tracer: tracer, serviceName: serviceName, port: port });
  return function zipkinExpressMiddleware(req, res, next) {
    tracer.scoped(function () {
      function readHeader(header) {
        var val = req.header(header);
        if (val != null) {
          return new Some(val);
        } else {
          return None;
        }
      }

      var id = instrumentation.recordRequest(req.method, formatRequestUrl(req), readHeader);

      res.on('finish', function () {
        tracer.scoped(function () {
          instrumentation.recordResponse(id, res.statusCode);
        });
      });

      next();
    });
  };
};