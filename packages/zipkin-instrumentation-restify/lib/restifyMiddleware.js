'use strict';

var _require = require('zipkin'),
    _require$option = _require.option,
    Some = _require$option.Some,
    None = _require$option.None,
    Instrumentation = _require.Instrumentation;

var url = require('url');

function headerOption(req, header) {
  var val = req.header(header);
  if (val != null) {
    return new Some(val);
  } else {
    return None;
  }
}

function formatRequestUrl(request) {
  return url.format({
    protocol: request.isSecure() ? 'https' : 'http',
    host: request.header('host'),
    pathname: request.path()
  });
}

module.exports = function restifyMiddleware(_ref) {
  var tracer = _ref.tracer,
      _ref$serviceName = _ref.serviceName,
      serviceName = _ref$serviceName === undefined ? 'unknown' : _ref$serviceName,
      _ref$port = _ref.port,
      port = _ref$port === undefined ? 0 : _ref$port;

  return function zipkinRestifyMiddleware(req, res, next) {
    var instrumentation = new Instrumentation.HttpServer({ tracer: tracer, serviceName: serviceName, port: port });
    var readHeader = headerOption.bind(null, req);
    tracer.scoped(function () {
      var id = instrumentation.recordRequest(req.method, formatRequestUrl(req), readHeader);

      var onCloseOrFinish = function onCloseOrFinish() {
        res.removeListener('close', onCloseOrFinish);
        res.removeListener('finish', onCloseOrFinish);

        tracer.scoped(function () {
          instrumentation.recordResponse(id, res.statusCode);
        });
      };

      res.once('close', onCloseOrFinish);
      res.once('finish', onCloseOrFinish);

      next();
    });
  };
};