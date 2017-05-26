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

package egg;

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
  - `new app.grpcProto.egg.share.ShowCase(adress)`

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


## Example

see [grpc.tests.js](test/grpc.tests.js).

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)
