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
  - `new app.grpcProto.egg.share.ShowCase(adress)`

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


## 示例

参见 [grpc.tests.js](test/grpc.tests.js).

## 问题反馈

访问并发起 [issue](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)