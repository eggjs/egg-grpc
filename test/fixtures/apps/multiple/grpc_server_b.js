'use strict';

const grpc = require('grpc');
const path = require('path');
const proto = grpc.load(path.join(__dirname, 'app/proto/service_b.proto'), 'proto', { convertFieldsToCamelCase: true });

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
        msg: 'from server b',
        originRequest: call.request,
        originMeta: call.metadata.getMap(),
      });
    }, 300);
  },
};

module.exports = (host = 'localhost:50053') => {
  const server = new grpc.Server();
  server.addService(proto.example.ServiceB.service, handlers);

  server.bind(host, grpc.ServerCredentials.createInsecure());
  server.start();
  console.log('grpc server start at %s', host);
  server.host = host;
  return server;
};

if (require.main === module) {
  module.exports(process.argv[2]);
}
