'use strict';

const GRPC_CLASS = Symbol('application#GrpcClass');
const create_class = require('../../lib/gprc_class');

module.exports = {
  get GrpcClass() {
    if (!this[GRPC_CLASS]) {
      this[GRPC_CLASS] = create_class(this);
    }
    return this[GRPC_CLASS];
  },
};
