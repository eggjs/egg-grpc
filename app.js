'use strict';

const loader = require('./lib/grpc_loader');
const fs = require('fs');
const path = require('path');


module.exports = app => {
  // grpc.setLogger(app.coreLogger);
  const GrpcLoader = app.loader.GrpcLoader = loader(app);
  new GrpcLoader({}).load();
  // grpc ssl
  if (app.config.grpc.clientSsl.enable) {
    if (app.config.grpc.clientSsl.rootCerts.trim() !== '') {
      const rootCerts = path.join(app.baseDir, app.config.grpc.clientSsl.rootCerts)
      if (fs.existsSync(rootCerts)) {
        app.grpc.clientSsl.rootCerts = fs.readFileSync(rootCerts);
      }
    }
    if (app.config.grpc.clientSsl.privateKey.trim() != '') {
      const privateKey = path.join(app.baseDir, app.config.grpc.clientSsl.privateKey)
      if (fs.existsSync(privateKey)) {
        app.grpc.clientSsl.privateKey = fs.readFileSync(privateKey);
      }
    }
    if (app.config.grpc.clientSsl.certChain.trim() != '') {
      const certChain = path.join(app.baseDir, app.config.grpc.clientSsl.certChain)
      if (fs.existsSync(certChain)) {
        app.grpc.clientSsl.certChain = fs.readFileSync(certChain);
      }
    }
  }
};
