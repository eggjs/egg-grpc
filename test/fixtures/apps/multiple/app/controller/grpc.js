'use strict';

module.exports = app => {
  return class GrpcController extends app.Controller {
    * echoA() {
      const ctx = this.ctx;
      const grpcClient = ctx.grpc.example.serviceA;
      ctx.body = yield grpcClient.echo({ id: 1, userName: 'grpc' });
    }

    * echoB() {
      const ctx = this.ctx;
      const grpcClient = ctx.grpc.example.serviceB;
      ctx.body = yield grpcClient.echo({ id: 1, userName: 'grpc' });
    }
  };
};
