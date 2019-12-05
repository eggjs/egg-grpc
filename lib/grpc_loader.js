'use strict';

const path = require('path');
const grpc = require('grpc');
const traverse = require('traverse');
const extend = require('extend2');
const debug = require('debug')('grpc');
const fs = require('fs');

module.exports = app => {
  // 获取多个配置
  const multiConfig = app.config.grpc.clients;
  // 获取所有配置的对象键值
  const keys = Object.keys(multiConfig);
  // 循环获取多个配置，进行加载，采用类官方插件多实例实现方案
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    // 合并默认配置
    const config = Object.assign({}, app.config.grpc.default);
    Object.assign(config, multiConfig[key]);
    const config_clientSsl = Object.assign({}, config.clientSsl);
    Object.assign(config.clientSsl, app.config.grpc.default.clientSsl);
    Object.assign(config.clientSsl, config_clientSsl);
    const GrpcLoader = createGrpc(config, app);
    new GrpcLoader({}).load();
  }
};

/**
 * @param  {Object} config   框架处理之后的配置项，如果应用配置了多个实例，会将每一个配置项分别传入并调用多次该函数
 * @param  {Application} app 当前的应用
 * @return {Object}          返回创建的实例
 */
function createGrpc(config, app) {
  // grpc ssl
  if (config.clientSsl.enable) {
    config.clientSsl.rootCertsData = undefined;
    config.clientSsl.privateKeyData = undefined;
    config.clientSsl.certChainData = undefined;
    if (config.clientSsl.rootCerts !== '') {
      const rootCerts = path.join(app.baseDir, config.clientSsl.rootCerts);
      if (fs.existsSync(rootCerts)) {
        config.clientSsl.rootCertsData = fs.readFileSync(rootCerts);
      }
    }
    if (config.clientSsl.privateKey !== '') {
      const privateKey = path.join(app.baseDir, config.clientSsl.privateKey);
      if (fs.existsSync(privateKey)) {
        config.clientSsl.privateKeyData = fs.readFileSync(privateKey);
      }
    }
    if (config.clientSsl.certChain !== '') {
      const certChain = path.join(app.baseDir, config.clientSsl.certChain);
      if (fs.existsSync(certChain)) {
        config.clientSsl.certChainData = fs.readFileSync(certChain);
      }
    }
  }

  const defaults = {
    call: true,
    property: config.property,
    inject: app,
    fieldClass: 'grpcClasses',
    match: '**/*.proto',
    override: true,
    directory: app.loader.getLoadUnits().map(unit => path.join(unit.path, config.dir)),
    initializer(content, meta) {
      debug('loading proto: %s', meta.path);
      // load will change opts, so need to clone
      return grpc.load(meta.path, 'proto', Object.assign({}, config.loadOpts));
    },
  };

  class GrpcLoader extends app.loader.ContextLoader {
    constructor(options) {
      options = Object.assign({}, defaults, options);
      super(options);
    }

    parse() {
      const newItems = [];
      const items = super.parse();

      for (const item of items) {
        const { exports, fullpath } = item;

        // save origin proto to `app.grpcProto`
        extend(true, app.grpcProto, exports);

        // TODO: whether change case of Service/Message

        // traverse origin grpc proto to extract rpc service
        // `/example.Test/Echo` -> `app.grpcClasses.example.test` -> `yield ctx.grpc.example.test.echo()`
        traverse(exports).forEach(function (proto) {
          /* istanbul ignore next */
          if (this.circular) this.remove();

          if (proto.name === 'Client' || proto.name === 'ServiceClient') {
            const properties = this.path.map(camelize);
            proto.paths = properties;
            proto.grpcconfig = config.property; // key
            const item = {
              fullpath,
              properties,
              exports: wrapClass(proto),
            };
            newItems.push(item);
            this.update(proto, true);
            debug('register grpc service: %s', properties.join('.'));
          } else if (proto.name === 'Message') {
            this.update(proto, true);
          }
        });
      }
      // [{ fullpath, properties, exports }]
      return newItems;
    }
  }

  function wrapClass(...args) {
    return class GrpcSubClass extends app.GrpcClass {
      constructor(ctx) {
        super(ctx, ...args);
      }
    };
  }

  function camelize(input) {
    input = input.replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase());
    return input[0].toLowerCase() + input.substring(1);
  }

  return GrpcLoader;
}

