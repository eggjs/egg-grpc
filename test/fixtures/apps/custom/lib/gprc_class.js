'use strict';

module.exports = app => {
  return class CustomGrpcClass extends app.GrpcBaseClass {
    _beforeRequest(invokeArgs) {
      invokeArgs = super._beforeRequest(invokeArgs);
      invokeArgs.metadata.set('request-id', this.config.caller + '_' + Date.now());
      return invokeArgs;
    }
  };
};
