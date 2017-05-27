'use strict';

const GrpcBaseClass = require('../../lib/base_grpc');

module.exports = {

  /**
   * origin grpc proto, contains Service and Message
   */
  grpcProto: {},

  /**
   * provide to grpc loader
   */
  get GrpcClass() {
    return this.GrpcBaseClass;
  },

  /**
   * provide to app to extends it for custom `GrpcClass` purpose
   *
   * ```js
   * get GrpcClass() {
   *   if (!this[GRPC_CLASS]) {
   *     this[GRPC_CLASS] = class CustomClass extends this.GrpcBaseClass {
   *       constructor(...args) {
   *         super(...args);
   *       }
   *       someMethod() {}
   *     };
   *   }
   *   return this[GRPC_CLASS];
   * }
   * ```
   */
  get GrpcBaseClass() {
    return GrpcBaseClass;
  },
};
