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
    this.config = this.app.config.grpc;
    this.ProtoClass = ProtoClass;

    // delegate client rpc to this
    for (const key of Object.keys(this.ProtoClass.service)) {
      this[key] = function(...args) {
        return this.invokeRPC(key, ...args);
      };
    }
  }

  getRpcClient(rpc) {
    debug(`init client of ${this.ProtoClass.paths.join('.')}.${rpc}`);
    if (!this[CLIENT]) {
      this[CLIENT] = new this.ProtoClass(this.config.endpoint, grpc.credentials.createInsecure(), this.config.clientOpts);
    }
    // TODO: config.ssl
    return this[CLIENT];
  }

  invokeRPC(rpc, ...args) {
    const attrs = this.ProtoClass.service[rpc];

    const client = this.getRpcClient(rpc);

    if (attrs.requestStream && attrs.responseStream) {
      return this.invokeBidiStreamRequest(client, rpc, ...args);
    }

    if (attrs.requestStream) {
      return this.invokeClientStreamRequest(client, rpc, ...args);
    }

    if (attrs.responseStream) {
      return this.invokeServerStreamRequest(client, rpc, ...args);
    }

    return this.invokeUnaryRequest(client, rpc, ...args);
  }

  /**
   * Unary RPC, such as `rpc Echo(Request) returns (Response) {}`
   * @param {grpc.Client} client - grpc client instance
   * @param {String} rpc - rpc method name, camle case
   * @param {Object} data - data sent to sever
   * @param {Object|grpc.Metadata} [metadata] - metadata, support plain object
   * @param {Object} [options] - { timeout }
   * @return {Promise} response promise chain
   * @see http://www.grpc.io/docs/guides/concepts.html#unary-rpc
   * @example
   * ```js
   * yield client.echo(data, metadata, options);
   * ```
   */
  invokeUnaryRequest(client, rpc, data, metadata, options) {
    // different with grpc origin which `rcp(data, options)` for only 2 args
    // our usage is `rcp(data, meta)` for only 2 args
    return new Promise((resolve, reject) => {
      client[rpc].call(client, data, this.normalizeMetadata(metadata), this.normalizeOptions(options), (err, response) => {
        // TODO: adjust error stack
        // TODO: return meta ?
        if (err) return reject(this.normalizeError(err));
        return resolve(response);
      });
    });
  }

  /**
   * Client Streaming RPC, such as `rpc EchoClientStream(stream Request) returns (Response) {}`
   * @param {grpc.Client} client - grpc client instance
   * @param {String} rpc - rpc method name, camle case
   * @param {Object|grpc.Metadata} [metadata] - metadata, support plain object
   * @param {Object} [options] - { timeout }
   * @param {Function} [callback] - callback for response, `(err, response) => {}`
   * @return {Stream} write stream
   * @see http://www.grpc.io/docs/guides/concepts.html#client-streaming-rpc
   * @example
   * ```js
   * const stream = client.echoClientStream(meta, options, callback);
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
  invokeClientStreamRequest(client, rpc, metadata, options, callback) {
    const args = [ ...arguments ].slice(2);
    // rpc(fn) / rpc(meta, fn) / rpc(meta, opts, fn)
    if (args.length === 1) {
      callback = args[0];
      metadata = undefined;
      options = {};
    } else if (args.length === 2) {
      callback = args[1];
      options = {};
    }
    // TODO: do dirty job for stream
    return client[rpc].call(client, this.normalizeMetadata(metadata), this.normalizeOptions(options), callback);
  }

  /**
   * Server Streaming RPC, such as `rpc EchoServerStream(Request) returns (stream Response) {}`
   * @param {grpc.Client} client - grpc client instance
   * @param {String} rpc - rpc method name, camle case
   * @param {Object} data - data sent to sever
   * @param {Object|grpc.Metadata} [metadata] - metadata, support plain object
   * @param {Object} [options] - { timeout }
   * @return {Stream} read stream
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
  invokeServerStreamRequest(client, rpc, data, metadata, options) {
    // TODO: do dirty job for stream
    return client[rpc].call(client, data, this.normalizeMetadata(metadata), this.normalizeOptions(options));
  }

  /**
   * Bidirectional Streaming RPC, such as `rpc echoStreamStream(stream Request) returns (stream Response) {}`
   * @param {grpc.Client} client - grpc client instance
   * @param {String} rpc - rpc method name, camle case
   * @param {Object|grpc.Metadata} [metadata] - metadata, support plain object
   * @param {Object} [options] - { timeout }
   * @return {Stream} duplex stream
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
  invokeBidiStreamRequest(client, rpc, metadata, options) {
    // TODO: do dirty job for stream
    return client[rpc].call(client, this.normalizeMetadata(metadata), this.normalizeOptions(options));
  }

  /**
   * normalize metadata
   * @param {Object|grpc.Metadata} [metadata] - the metadata
   * @return {grpc.Metadata} - metadata
   * @see http://www.grpc.io/docs/guides/concepts.html#metadata
   * @see http://www.grpc.io/grpc/node/module-src_metadata-Metadata.html
   */
  normalizeMetadata(metadata) {
    if (metadata instanceof grpc.Metadata) return metadata;
    if (!metadata) return new grpc.Metadata();

    // object
    const result = new grpc.Metadata();
    Object.keys(metadata).forEach(key => {
      result.set(key, metadata[key]);
    });
    return result;
  }

  /**
   * normalize options
   * @param {Object} [options] - call options
   * @return {Object} - options
   */
  normalizeOptions(options = {}) {
    if (options.timeout) {
      options.deadline = Date.now() + Number(options.timeout);
    }
    return options;
  }

  normalizeError(err) {
    // err.message = `${err.message || ERROR_MAPPING[err.code]}(code=${err.code})`;
    err.message = `${err.message}(code=${err.code})`;
    return err;
  }
};
