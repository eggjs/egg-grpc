'use strict';

module.exports = app => {
  app.get('/echo', 'grpc.echo');
};
