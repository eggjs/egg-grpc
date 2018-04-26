'use strict';

module.exports = app => {
  app.get('/echoA', 'grpc.echoA');
  app.get('/echoB', 'grpc.echoB');
};
