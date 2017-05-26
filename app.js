'use strict';

const grpc = require('grpc');
const loader = require('./lib/grpc_loader');

module.exports = app => {
  // grpc.setLogger(app.coreLogger);
  const GrpcLoader = app.loader.GrpcLoader = loader(app);
  new GrpcLoader({}).load();
};
