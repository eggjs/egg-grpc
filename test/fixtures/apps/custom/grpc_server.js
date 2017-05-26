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
  module.exports(process.argv[2]);
}
