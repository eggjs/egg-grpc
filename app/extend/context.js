'use strict';

module.exports = {
  /**
   * origin grpc proto, contains Service and Message
   */
  get grpcProto() {
    return this.app.grpcProto;
  },
};
