'use strict';

/**
 * grpc config
 * @member Config#grpc
 * @property {String} dir - proto files dir, relative path
 * @property {String} property - default attach to `ctx.grpc.**`
 * @property {Object} loadOpts - options pass to `grpc.load(file, type, opts)`
 * @property {Boolean} loadOpts.convertFieldsToCamelCase - default to true, `string user_name` -> `userName`
 * @property {Object} clientOpts - options pass to `new Client(host, credentials, opts)`
 * @property {String} endpoint - default andress to connect, for debug or showcase purpose
 * @property {Number} timeout - default 5000ms
 * @property {Boolean} clientSsl.enable - enable client ssl
 * @property {Buffer} clientSsl.rootCerts - The root certificate data file path,作为grpc client时仅提供该项作为证书即可
 * @property {Buffer} clientSsl.privateKey - The client certificate private key file path, if applicable
 * @property {Buffer} clientSsl.certChain - The client certificate cert chain file path, if applicable
 * @property {Object} clientSsl.verifyOptions - Additional peer verification options, if desired
 * @property {Object} clientSsl.options - 主要用于grpc.ssl_target_name_override和grpc.default_authority的配置
 */
exports.grpc = {
  dir: 'app/proto',
  property: 'grpc',
  loadOpts: {
    convertFieldsToCamelCase: true,
  },
  clientOpts: {},
  endpoint: 'localhost:50051',
  timeout: 5000,
  /** 
   * 2019-12-03 by 张晓东
   * 通过扩展原有配置的形式,使其支持tls/ssl安全
  */
  clientSsl: {
    enable: false,
    // grpc.credentials.createSsl
    // config/grpc/cert.server.crt
    rootCerts: '', //
    privateKey: '', // 作为grpc client时无需填写
    certChain: '', // 作为grpc client时无需填写
    verifyOptions: {},
    options: {
      "grpc.ssl_target_name_override": 'example.server',
      "grpc.default_authority": 'example.server'
    }
  }
};
