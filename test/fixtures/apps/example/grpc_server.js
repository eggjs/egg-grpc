'use strict';

const grpc = require('grpc');
const path = require('path');
const proto = grpc.load(path.join(__dirname, 'app/proto/test.proto'), 'proto', { convertFieldsToCamelCase: true });

const handlers = {
  echo(call, callback) {
    console.log('[Server] receive: %j, meta: %j', call.request, call.metadata.getMap());
    // send metadata
    const metadata = new grpc.Metadata();
    metadata.set('from', 'server');
    call.sendMetadata(metadata);
    // send result
    setTimeout(() => {
      callback(null, {
        id: call.request.id,
        msg: 'from server',
        originRequest: call.request,
        originMeta: call.metadata.getMap(),
      });
    }, 300);
  },

  echoError(call, callback) {
    const metadata = new grpc.Metadata();
    metadata.set('from', 'server');
    const error = new Error('this is an error');
    error.code = 444;
    error.metadata = metadata;
    callback(error);
  },

  echoComplex(call, callback) {
    console.log('[Server] receive: %j, meta: %j', call.request, call.metadata.getMap());
    callback(null, {
      list: [
        { id: call.request.list[0].id, userName: 'a' },
        { id: call.request.list[1].id, userName: 'b' },
      ],
      mapping: {
        a: { id: call.request.mapping.a.id, userName: 'a' },
        b: { id: call.request.mapping.b.id, userName: 'b' },
      },
    });
  },

  echoTimeout(call, callback) {
    console.log('[Server] receive:', call.request, call.metadata.getMap());
    // send result
    setTimeout(() => {
      callback(null, {
        id: call.request.id,
        msg: 'from server',
      });
    }, 1000);
  },

  echoClientStream(call, callback) {
    const messages = [];

    call.on('data', function(m) {
      console.log('[Server] receive stream:', m);
      messages.push(m);
    });
    call.on('end', function() {
      console.log('[Server] receive stream done:', messages.length);

      // send metadata
      const metadata = new grpc.Metadata();
      metadata.set('Count', messages.length.toString());
      call.sendMetadata(metadata);

      const statusMeta = new grpc.Metadata();
      statusMeta.set('cost', '100ms');

      // send result
      setTimeout(() => {
        callback(null, {
          msg: `Server Received: ${JSON.stringify(messages)}`,
          originMeta: call.metadata.getMap(),
        }, statusMeta);
      }, 1000);
    });
  },

  echoServerStream(call) {
    console.log('[Server] receive:', call.request, call.metadata.getMap());

    setTimeout(() => {
      // send metadata
      const metadata = new grpc.Metadata();
      metadata.set('from', 'server');
      call.sendMetadata(metadata);

      // send result
      call.write({ msg: 'a', originMeta: call.metadata.getMap() });
      call.write({ msg: 'b', originMeta: call.metadata.getMap() });

      const statusMeta = new grpc.Metadata();
      statusMeta.set('cost', '100ms');
      call.sendMetadata(metadata);
      call.end(statusMeta);
    }, 1000);
  },

  echoStreamStream(call) {
    call.on('data', function(message) {
      console.log('[Server] receive: %j, meta: %j', message, call.metadata.getMap());

      const metadata = new grpc.Metadata();
      metadata.set('from', 'server');
      call.sendMetadata(metadata);

      call.write({ id: message.id, originMeta: call.metadata.getMap() }, metadata);
    });

    call.on('end', function() {
      const statusMeta = new grpc.Metadata();
      statusMeta.set('cost', '100ms');
      call.end(statusMeta);
    });
  },
};

module.exports = (host = 'localhost:50051') => {
  const server = new grpc.Server();
  server.addService(proto.example.Test.service, handlers);

  server.bind(host, grpc.ServerCredentials.createInsecure());
  server.start();
  console.log('grpc server start at %s', host);
  server.host = host;
  return server;
};

if (require.main === module) {
  const server = module.exports(process.argv[2]);
  process.once('disconnect', () => {
    // wait a loop for SIGTERM event happen
    setImmediate(() => {
      // if disconnect event emit, maybe master exit in accident
      server.tryShutdown();
      console.error('receive disconnect event on child_process fork mode, exiting with code:110');
      process.exit(110);
    });
  });

  process.once('SIGTERM', () => {
    console.info('receive signal SIGTERM, exiting with code:0');
    server.tryShutdown();
    process.exit(0);
  });

  process.once('exit', code => {
    const level = code === 0 ? 'info' : 'error';
    console[level]('exit with code:%s', code);
    server.tryShutdown();
  });
}
