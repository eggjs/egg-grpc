'use strict';

module.exports = app => {
  return class GrpcController extends app.Controller {
    * echo() {
      const ctx = this.ctx;
      const grpcClient = ctx.grpc.example.test;
      ctx.body = yield grpcClient.echo({ id: 1, userName: 'grpc' });
    }
  };
};
