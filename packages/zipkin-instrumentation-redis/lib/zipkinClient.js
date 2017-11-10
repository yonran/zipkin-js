'use strict';

var _require = require('zipkin'),
    Annotation = _require.Annotation,
    InetAddress = _require.InetAddress;

var redisCommands = require('redis-commands');
module.exports = function zipkinClient(tracer, redis, options) {
  var serviceName = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'unknown';
  var remoteServiceName = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'redis';

  var sa = {
    serviceName: remoteServiceName,
    host: new InetAddress(options.host),
    port: options.port
  };
  function mkZipkinCallback(callback, id) {
    return function zipkinCallback() {
      tracer.scoped(function () {
        tracer.setId(id);
        tracer.recordAnnotation(new Annotation.ClientRecv());
      });

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      callback.apply(this, args);
    };
  }
  function commonAnnotations(rpc) {
    tracer.recordRpc(rpc);
    tracer.recordAnnotation(new Annotation.ServiceName(serviceName));
    tracer.recordAnnotation(new Annotation.ServerAddr(sa));
    tracer.recordAnnotation(new Annotation.ClientSend());
  }

  var redisClient = redis.createClient(options);
  var methodsToWrap = redisCommands.list.concat('batch');
  var methodsThatReturnMulti = ['batch', 'multi'];
  var restrictedCommands = ['ping', 'flushall', 'flushdb', 'select', 'auth', 'info', 'quit', 'slaveof', 'config', 'sentinel'];
  var wrap = function wrap(client, traceId) {
    var clientNeedsToBeModified = client;
    methodsToWrap.forEach(function (method) {
      if (restrictedCommands.indexOf(method) > -1) {
        return;
      }
      var actualFn = clientNeedsToBeModified[method];
      if (methodsThatReturnMulti.indexOf(method) > -1) {
        clientNeedsToBeModified[method] = function () {
          for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
          }

          var multiInstance = actualFn.apply(this, args);
          var id = void 0;
          tracer.scoped(function () {
            id = tracer.createChildId();
            tracer.setId(id);
            tracer.recordBinary('commands', JSON.stringify(args[0]));
          });
          wrap(multiInstance, id);
          return multiInstance;
        };
        return;
      }
      clientNeedsToBeModified[method] = function () {
        for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
          args[_key3] = arguments[_key3];
        }

        var callback = args.pop();
        var id = traceId;
        tracer.scoped(function () {
          if (id === undefined) {
            id = tracer.createChildId();
          }
          tracer.setId(id);
          commonAnnotations(method);
        });
        var wrapper = mkZipkinCallback(callback, id);
        var newArgs = [].concat(args, [wrapper]);
        actualFn.apply(this, newArgs);
      };
    });
  };

  wrap(redisClient);
  return redisClient;
};