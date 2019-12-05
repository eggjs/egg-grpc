'use strict';

const loader = require('./lib/grpc_loader');

module.exports = app => {
  // grpc.setLogger(app.coreLogger);
  loader(app);
};
