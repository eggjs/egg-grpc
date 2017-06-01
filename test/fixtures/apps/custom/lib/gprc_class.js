'use strict';

module.exports = app => {
  return class CustomGrpcClass extends app.GrpcBaseClass {
    _invokeUnaryRequest(client, rpc, data, metadata, options) {
      metadata.set('request-id', this.config.caller + '_' + Date.now());
      return super._invokeUnaryRequest(client, rpc, data, metadata, options);
    }
  };
};
