'use strict';

var _require = require('zipkin'),
    _require$option = _require.option,
    Some = _require$option.Some,
    None = _require$option.None,
    Instrumentation = _require.Instrumentation;

var url = require('url');
var pkg = require('../package.json');

function headerOption(headers, header) {
  var val = headers[header.toLowerCase()];
  if (val != null) {
    return new Some(val);
  } else {
    return None;
  }
}

exports.register = function (server, _ref, next) {
  var tracer = _ref.tracer,
      _ref$serviceName = _ref.serviceName,
      serviceName = _ref$serviceName === undefined ? 'unknown' : _ref$serviceName,
      _ref$port = _ref.port,
      port = _ref$port === undefined ? 0 : _ref$port;

  var instrumentation = new Instrumentation.HttpServer({ tracer: tracer, serviceName: serviceName, port: port });
  if (tracer == null) {
    next(new Error('No tracer specified'));
    return;
  }

  server.ext('onRequest', function (request, reply) {
    var headers = request.headers;

    var readHeader = headerOption.bind(null, headers);
    var plugins = request.plugins;

    tracer.scoped(function () {
      var id = instrumentation.recordRequest(request.method, url.format(request.url), readHeader);

      plugins.zipkin = {
        traceId: id
      };

      return reply.continue();
    });
  });

  server.ext('onPreResponse', function (request, reply) {
    var response = request.response;

    var statusCode = response.isBoom ? response.output.statusCode : response.statusCode;

    tracer.scoped(function () {
      instrumentation.recordResponse(request.plugins.zipkin.traceId, statusCode);
    });

    return reply.continue();
  });

  next();
};

exports.register.attributes = { pkg: pkg };