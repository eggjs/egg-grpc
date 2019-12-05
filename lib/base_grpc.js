'use strict';

const grpc = require('grpc');
const debug = require('debug')('grpc');
const CLIENT = Symbol('client');
const ERROR_MAPPING = {};

Object.keys(grpc.status).forEach(key => {
  ERROR_MAPPING[grpc.status[key]] = key;
});

module.exports = class BaseGrpc {
  /**
   * @constructor
   * @param {Context} ctx - egg context
   * @param {Object} ProtoClass - grpc service proto
   */
  constructor(ctx, ProtoClass) {
    this.ctx = ctx;
    this.app = ctx.app;
    // this.config = this.app.config.grpc;
    const key = ProtoClass.grpcconfig; // 获取对应的config的key值
    this.config = this.app.config.grpc.clients[key]; // 获取对应的key值的config对象
    this.ProtoClass = ProtoClass;

    // delegate client rpc to this
    for (const key of Object.keys(this.ProtoClass.service)) {
      this[key] = function (...args) {
        return this._invokeRPC(key, ...args);
      };
    }
  }

  /**
   * get client instance
   * @param {String} rpc - rpc method name
   * @return {grpc.Client} grpc client intance
   * @protected
   */
  _getRpcClient(rpc) {
    debug(`init client of ${this.ProtoClass.paths.join('.')}.${rpc}`);
    if (!this[CLIENT]) {
      // options should NOT reuse, otherwise the user-agent will oom you!
      // https://github.com/grpc/grpc/blob/master/src/node/src/client.js#L464
      if (!this.config.clientSsl.enable) {
        this[CLIENT] = new this.ProtoClass(this.config.endpoint, grpc.credentials.createInsecure(), Object.assign({}, this.config.clientOpts));
      } else {
        const ssl_creds = grpc.credentials.createSsl(this.config.clientSsl.rootCertsData, this.config.clientSsl.privateKeyData, this.config.clientSsl.certChainData, this.config.clientSsl.verifyOptions);
        this[CLIENT] = new this.ProtoClass(this.config.endpoint, ssl_creds, Object.assign({}, this.config.clientOpts, this.config.clientSsl.options));
      }
    }
    return this[CLIENT];
  }

  /**
   * invoke rpc method
   * @param {String} rpc - rpc method name
   * @param {Array} args - method args, dep to rpc method type
   * @return {Promise|Stream} dep to rpc method type
   * @protected
   */
  _invokeRPC(rpc, ...args) {
    const attrs = this.ProtoClass.service[rpc];
    let data;
    let metadata;
    let options;

    const client = this._getRpcClient(rpc);

    // Bidirectional Streaming RPC
    // client.echoStreamStream(metadata, options)
    if (attrs.requestStream && attrs.responseStream) {
      metadata = args[0];
      options = args[1];
      const invokeArgs = this._beforeRequest({ client, rpc, metadata, options, attrs });
      return this._invokeBidiStreamRequest(invokeArgs);
    }

    // Client Streaming RPC
    // rpc(cb) / rpc(meta, cb) / rpc(meta, opts, cb)
    if (attrs.requestStream) {
      let callback;
      if (args.length === 1) {
        callback = args[0];
        metadata = undefined;
        options = undefined;
      } else if (args.length === 2) {
        callback = args[1];
        metadata = args[0];
        options = undefined;
      } else {
        [metadata, options, callback] = args;
      }
      const invokeArgs = this._beforeRequest({ client, rpc, metadata, options, attrs, callback });
      return this._invokeClientStreamRequest(invokeArgs);
    }

    // Server Streaming RPC
    // rpc(data, meta, options)
    if (attrs.responseStream) {
      data = args[0];
      metadata = args[1];
      options = args[2];
      const invokeArgs = this._beforeRequest({ client, rpc, data, metadata, options, attrs });
      return this._invokeServerStreamRequest(invokeArgs);
    }

    // Unary RPC
    // rpc(data) / rpc(data, options) / rpc(data, metadata, options)
    data = args[0];
    if (args.length === 2) {
      metadata = undefined;
      options = args[1];
    } else if (args.length === 3) {
      metadata = args[1];
      options = args[2];
    }
    const invokeArgs = this._beforeRequest({ client, rpc, data, metadata, options, attrs });
    return this._invokeUnaryRequest(invokeArgs);
  }

  /**
   * last change to modify invoke args
   * @param {Object} invokeArgs - { client, rpc, data, metadata, options, attrs, callback }
   * @return {Object} final invoke args
   * @protected
   */
  _beforeRequest(invokeArgs) {
    let { metadata, options } = invokeArgs;

    if (!metadata) {
      invokeArgs.metadata = new grpc.Metadata();
    } else if (!(metadata instanceof grpc.Metadata)) {
      // object
      invokeArgs.metadata = new grpc.Metadata();
      Object.keys(metadata).forEach(key => {
        invokeArgs.metadata.set(key, metadata[key]);
      });
    }
    metadata = invokeArgs.metadata;

    options = invokeArgs.options = Object.assign({}, options);
    if (!options.deadline) {
      const now = Date.now();
      Object.defineProperty(options, 'deadline', {
        get() {
          return options.timeout ? now + Number(options.timeout) : undefined;
        },
      });
    }
    return invokeArgs;
  }

  /**
   * Unary RPC, such as `rpc Echo(Request) returns (Response) {}`
   * @param {grpc.Client} client - grpc client instance
   * @param {String} rpc - rpc method name, camle case
   * @param {Object} data - data sent to sever
   * @param {grpc.Metadata} [metadata] - metadata
   * @param {Object} [options] - { timeout }
   * @return {Promise} response promise chain
   * @see http://www.grpc.io/docs/guides/concepts.html#unary-rpc
   * @protected
   * @example
   * ```js
   * yield client.echo(data, metadata, options);
   * yield client.echo(data, options);
   * ```
   */
  _invokeUnaryRequest({ client, rpc, data, metadata, options }) {
    const errorForStack = {};
    Error.captureStackTrace(errorForStack);

    return new Promise((resolve, reject) => {
      client[rpc].call(client, data, metadata, options, (err, response) => {
        // TODO: return meta ?
        if (err) {
          // adjust error stack
          // replace prefix `[object Object]\n`
          err.stack = 'Grpc Error: ' + err.message + errorForStack.stack.substring('[object Object]'.length);
          const api = `${this.ProtoClass.paths.join('.')}.${rpc}`;
          err.message = `${err.message}(api=${api}, code=${err.code}, ${ERROR_MAPPING[err.code]})`;
          return reject(err);
        }
        return resolve(response);
      });
    });
  }

  /**
   * Client Streaming RPC, such as `rpc EchoClientStream(stream Request) returns (Response) {}`
   * @param {grpc.Client} client - grpc client instance
   * @param {String} rpc - rpc method name, camle case
   * @param {grpc.Metadata} [metadata] - metadata
   * @param {Object} [options] - { timeout }
   * @param {Function} callback - required, callback for response, `(err, response) => {}`
   * @return {Stream} write stream
   * @protected
   * @see http://www.grpc.io/docs/guides/concepts.html#client-streaming-rpc
   * @example
   * ```js
   * const stream = client.echoClientStream(meta, options, callback);
   * // const stream = client.echoClientStream(callback);
   * // const stream = client.echoClientStream(meta, callback);
   *
   * // trigger order: metadata -> callback -> status
   * stream.once('metadata', meta => {});
   * stream.once('status', status => {});
   * stream.on('error', status => {});
   *
   * // send data to server or end
   * stream.write(data1);
   * stream.write(data2);
   * stream.end(data4);
   * ```
   */
  _invokeClientStreamRequest({ client, rpc, metadata, options, callback }) {
    // TODO: do dirty job for stream
    return client[rpc].call(client, metadata, options, callback);
  }

  /**
   * Server Streaming RPC, such as `rpc EchoServerStream(Request) returns (stream Response) {}`
   * @param {grpc.Client} client - grpc client instance
   * @param {String} rpc - rpc method name, camle case
   * @param {Object} data - data sent to sever
   * @param {grpc.Metadata} [metadata] - metadata
   * @param {Object} [options] - { timeout }
   * @return {Stream} read stream
   * @protected
   * @see http://www.grpc.io/docs/guides/concepts.html#server-streaming-rpc
   * @example
   * ```js
   * const stream = client.echoServerStream(data, meta, options);
   *
   * // trigger order: metadata -> data -> status -> end
   * stream.on('data', response => {});
   * stream.on('end', response => {});
   *
   * stream.once('metadata', meta => {});
   * stream.once('status', status => {});
   * stream.on('error', status => {});
   * ```
   */
  _invokeServerStreamRequest({ client, rpc, data, metadata, options }) {
    // TODO: do dirty job for stream
    return client[rpc].call(client, data, metadata, options);
  }

  /**
   * Bidirectional Streaming RPC, such as `rpc echoStreamStream(stream Request) returns (stream Response) {}`
   * @param {grpc.Client} client - grpc client instance
   * @param {String} rpc - rpc method name, camle case
   * @param {grpc.Metadata} [metadata] - metadata
   * @param {Object} [options] - { timeout }
   * @return {Stream} duplex stream
   * @protected
   * @see http://www.grpc.io/docs/guides/concepts.html#bidirectional-streaming-rpc
   * @example
   * ```js
   * const stream = client.echoStreamStream(meta, options);
   *
   * // trigger order: metadata -> data -> status -> end
   * stream.on('data', response => {});
   * stream.on('end', () => {});
   *
   * stream.once('metadata', meta => {});
   * stream.once('status', status => {});
   * stream.on('error', status => {});
   *
   * // send data to server or end
   * stream.write(data1);
   * stream.write(data2);
   * stream.end(data3);
   * ```
   */
  _invokeBidiStreamRequest({ client, rpc, metadata, options }) {
    // TODO: do dirty job for stream
    return client[rpc].call(client, metadata, options);
  }
};
