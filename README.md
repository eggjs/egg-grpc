# egg-grpc

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-grpc.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-grpc
[travis-image]: https://img.shields.io/travis/eggjs/egg-grpc.svg?style=flat-square
[travis-url]: https://travis-ci.org/eggjs/egg-grpc
[codecov-image]: https://img.shields.io/codecov/c/github/eggjs/egg-grpc.svg?style=flat-square
[codecov-url]: https://codecov.io/github/eggjs/egg-grpc?branch=master
[david-image]: https://img.shields.io/david/eggjs/egg-grpc.svg?style=flat-square
[david-url]: https://david-dm.org/eggjs/egg-grpc
[snyk-image]: https://snyk.io/test/npm/egg-grpc/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/egg-grpc
[download-image]: https://img.shields.io/npm/dm/egg-grpc.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-grpc

[grpc](http://www.grpc.io) plugin for egg

## Install

```bash
$ npm i egg-grpc --save
```

```js
// {app_root}/config/plugin.js
exports.grpc = {
  enable: true,
  package: 'egg-grpc',
};
```

## Configuration

```js
// {app_root}/config/config.default.js
exports.grpc = {
  endpoint: 'localhost:50051',
  // dir: 'app/proto', // proto files dir, relative path
  // property: 'grpc', // default attach to `ctx.grpc.**`
  // loadOpts: { convertFieldsToCamelCase: true, }, // message field case: `string user_name` -> `userName`
};
```

see [config/config.default.js](config/config.default.js) for more detail.

## Usage

fixtures:

```bash
app/proto
├── egg
│   └── test
│       ├── game.proto
│       └── message.proto
├── uc
│   └── test.proto
└── share.proto
```

```protobuf
// app/proto/share.proto
syntax = "proto3";

package egg.share;

message Status {
  string code = 1;
  string err_msg = 2;
}

service ShowCase {
  rpc Echo(Status) returns (Status) {}
}
```

quickstart:

```js
// mount by `package` define, not proto file path
const client = ctx.grpc.egg.share.showCase;
const result = yield client.echo({ code: 200 });
console.log(result);
```

### Folder Structure

- default to load proto files from `app/proto`.
- file path is only use for file manager, it DON'T affect the proto class path at `ctx` and `app`.
- such as `app/proto/share.proto`, it defined as `package egg;`, so will visit as
  - `yield ctx.grpc.egg.share.showCase.echo(data, meta, options)`
  - `new app.grpcProto.egg.share.Status({ code: 200 })`
  - `new app.grpcProto.egg.share.ShowCase(address)`
  - `new ctx.grpcProto.egg.share.ShowCase(address)`

### Name Conversion

- [Protobuff Style Guide](https://developers.google.com/protocol-buffers/docs/style)
- [GRPC Concepts](http://www.grpc.io/docs/guides/concepts.html)

| term        | case at proto      | case when load                     |
| ----------- | ------------------ | ---------------------------------- |
| **package** | lowercase with `.` | camleCase if contains `_`          |
| **service** | PascalCase         | camleCase when initialize at `ctx` |
| **rpc**     | PascalCase         | camleCase                          |
| **message** | PascalCase         | PascalCase at `app`                |
| **field**   | snake_case         | camleCase                          |
| **enums**   | CONSTANT_CASE      | CONSTANT_CASE                      |

## API

### Custom Options

- {Number} `timeout` - for convenient usage of `deadline`, equals to `{ deadline: Date.now() + timeout }`

### Service && Message

You can get service instance and invoke rpc by `ctx.mypackage.myService.myRpc({ id: 1 })`.

Usually, you don't need to instantiate a message instace, grpc will do it for you, however you can create it by `new app.grpcProto.mypackage.SomeMessage({ id: 1 })`.

### Unary RPC

```js
/**
 * Unary RPC, such as `rpc Echo(Request) returns (Response) {}`
 * @param {Object} data - data sent to sever
 * @param {Object|grpc.Metadata} [metadata] - metadata, support plain object
 * @param {Object} [options] - { timeout }
 * @return {Promise} response promise chain
 * @see http://www.grpc.io/docs/guides/concepts.html#unary-rpc
 */
// const client = ctx.grpc.<package>.<service>;
yield client.echo(data, metadata, options);
yield client.echo(data, options);
```

### Client Streaming RPC

```js
/**
 * Client Streaming RPC, such as `rpc EchoClientStream(stream Request) returns (Response) {}`
 * @param {Object|grpc.Metadata} [metadata] - metadata, support plain object
 * @param {Object} [options] - { timeout }
 * @param {Function} [callback] - callback for response, `(err, response) => {}`
 * @return {Stream} write stream
 * @see http://www.grpc.io/docs/guides/concepts.html#client-streaming-rpc
 */
const stream = client.echoClientStream(meta, options, callback);
// const stream = client.echoClientStream(callback);
// const stream = client.echoClientStream(meta, callback);
// trigger order: metadata -> callback -> status
stream.once('metadata', meta => {});
stream.once('status', status => {});
stream.on('error', status => {});
// send data to server or end
stream.write(data1);
stream.write(data2);
stream.end(data4);
```

### Server Streaming RPC

```js
/**
 * Server Streaming RPC, such as `rpc EchoServerStream(Request) returns (stream Response) {}`
 * @param {Object} data - data sent to sever
 * @param {Object|grpc.Metadata} [metadata] - metadata, support plain object
 * @param {Object} [options] - { timeout }
 * @return {Stream} read stream
 * @see http://www.grpc.io/docs/guides/concepts.html#server-streaming-rpc
 */
const stream = client.echoServerStream(data, meta, options);
// trigger order: metadata -> data -> status -> end
stream.on('data', response => {});
stream.on('end', response => {});
stream.once('metadata', meta => {});
stream.once('status', status => {});
stream.on('error', status => {});
```

### Bidirectional Streaming RPC

```js
/**
 * Bidirectional Streaming RPC, such as `rpc echoStreamStream(stream Request) returns (stream Response) {}`
 * @param {Object|grpc.Metadata} [metadata] - metadata, support plain object
 * @param {Object} [options] - { timeout }
 * @return {Stream} duplex stream
 * @see http://www.grpc.io/docs/guides/concepts.html#bidirectional-streaming-rpc
 */
const stream = client.echoStreamStream(meta, options);
// trigger order: metadata -> data -> status -> end
stream.on('data', response => {});
stream.on('end', () => {});
stream.once('metadata', meta => {});
stream.once('status', status => {});
stream.on('error', status => {});
// send data to server or end
stream.write(data1);
stream.write(data2);
stream.end(data3);
```

## Example

see [grpc.test.js](test/grpc.test.js).

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)
