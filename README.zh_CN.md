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

[grpc](http://www.grpc.io) 的 eggjs 插件

## 安装

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

## 配置

```js
// {app_root}/config/config.default.js
exports.grpc = {
  endpoint: 'localhost:50051',
  // dir: 'app/proto', // proto 文件目录，相对路径
  // property: 'grpc', // 默认挂载到 `ctx.grpc.**`
  // loadOpts: { convertFieldsToCamelCase: true, }, // message field case: `string user_name` -> `userName`
};
```

更多参数配置见 [config/config.default.js](config/config.default.js)。

## 使用说明

示例代码：

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

package egg;

message Status {
  string code = 1;
  string err_msg = 2;
}

service ShowCase {
  rpc Echo(Status) returns (Status) {}
}
```

快速开始:

```js
const client = ctx.grpc.egg.share.showCase;
const result = yield client.echo({ code: 200 });
console.log(result);
```

### 文件目录

- 默认从 `app/proto` 目录加载 proto 文件。
- 目录仅用于文件管理，不影响到挂载到 `ctx` 和 `app` 上的访问路径，后者仅跟 `package` 定义有关。
- 譬如上述的 `app/proto/share.proto` 文件，定义为 `package egg;`，所以对应的访问方式：
  - `yield ctx.grpc.egg.share.showCase.echo(data, meta, options)`
  - `new app.grpcProto.egg.share.Status({ code: 200 })`
  - `new app.grpcProto.egg.share.ShowCase(address)`
  - `new ctx.grpcProto.egg.share.ShowCase(address)`

### 命名转换规则

- [Protobuff Style Guide](https://developers.google.com/protocol-buffers/docs/style)
- [GRPC Concepts](http://www.grpc.io/docs/guides/concepts.html)

| 术语          | 命名规范(proto 定义) | 加载后                       |
| ----------- | -------------- | ------------------------- |
| **package** | 小写，用 `.` 分隔    | 若存在 `_`，则驼峰               |
| **service** | 类名风格，首字母大写     | 初始化到 `ctx` 后为驼峰格式         |
| **rpc**     | 类名风格，首字母大写     | 驼峰格式                      |
| **message** | 类名风格，首字母大写     | 按原格式挂载在 `app.grpcProto` 上 |
| **field**   | 下划线风格，全小写      | 驼峰格式                      |
| **enums**   | 下划线风格，全大写      | 不变                        |

## API

### 自定义选项

- {Number} `timeout` - 语法糖，等价于 `{ deadline: Date.now() + timeout }`

### Service && Message

你可以通过 `ctx.mypackage.myService.myRpc({ id: 1 })` 获取到  grpc service 的实例并执行 rpc 方法。

一般来说，`message` 是无需实例化的，只需传递普通的 object，grpc 会自动校验。当然你也可以使用 `new app.grpcProto.mypackage.SomeMessage({ id: 1 })`。

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

## 示例

参见 [grpc.tests.js](test/grpc.tests.js).

## 问题反馈

访问并发起 [issue](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)
