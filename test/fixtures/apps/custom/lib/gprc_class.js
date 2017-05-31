'use strict';

module.exports = app => {
  return class CustomGrpcClass extends app.GrpcBaseClass {
    invokeUnaryRequest(client, rpc, data, metadata, options) {
      metadata.set('request-id', this.config.caller + '_' + Date.now());
      return super.invokeUnaryRequest(client, rpc, data, metadata, options);
    }
  };
};
