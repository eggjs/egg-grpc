'use strict';

const GrpcBaseClass = require('../../lib/base_grpc');
const GRPC = Symbol('Application#grpc');

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
  get grpc() {
    // this 就是 app 对象，在其中可以调用 app 上的其他方法，或访问属性
    if (!this[GRPC]) {
      this[GRPC] = { clientSsl: { rootCerts: null, privateKey: null, certChain: null } }
    }
    return this[GRPC];
  }
};
