'use strict';

const mm = require('egg-mock');
const assert = require('assert');

describe('test/pkg.test.js', () => {
  let app;
  before(() => {
    app = mm.app({
      baseDir: 'apps/pkg',
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mm.restore);

  it('should load', () => {
    const ctx = app.mockContext();

    assert(typeof ctx.grpc.egg.test.gameInfoService.listAll === 'function');

    // check proto
    const testProto = app.grpcProto.egg.test;
    assert(testProto.GameInfoList.name === 'Message');
    assert(testProto.GameInfoService.name === 'Client' || testProto.GameInfoService.name === 'ServiceClient');
    assert(testProto.GameInfoService.service.listAll);

    // don't care your real path
    assert(!app.grpcProto.random);
    assert(app.grpcProto.abc.RootMsg);
    assert(app.grpcProto.egg.Status);

    // multi
    assert(ctx.grpc.egg.multi.one.listOne);
    assert(ctx.grpc.egg.multi.two.listTwo);

    // import
    assert(ctx.grpc.test.one.list);
    assert(ctx.grpc.test.two.list);
    assert(ctx.grpc.share.utils.list);
  });

  it('should process case style at `ctx.grpc`', () => {
    const ctx = app.mockContext();
    const proto = ctx.grpc.style;

    // will change `rpc` case
    assert(proto.testService.pascalCase);
    assert(proto.testService.snakeCase);
    assert(proto.testService.camelCase);
    assert(proto.testService.constantCase);
    assert(proto.testService.uppercase);

    // will change `service` case
    assert(proto.pascalCaseService);
    assert(proto.snakeCaseService);
    assert(proto.camelCaseService);

    // will change `package` case
    assert(proto.pascalCase.test);
    assert(proto.snakeCase.test);
    assert(proto.camelCase.test);
  });

  it('should process case style with built-in `grpc.load`', () => {
    const proto = app.grpcProto.style;

    // WON'T change origin `package` case
    assert(proto.PascalCase.Test);
    assert(proto.snake_case.Test);
    assert(proto.camelCase.Test);

    // WON'T change origin `service` case
    assert(proto.PascalCaseService);
    assert(proto.snake_case_service);
    assert(proto.camelCaseService);
    assert(proto.CONSTANT_CASE_SERVICE);
    assert(proto.UPPERCASESERVICE);

    // WON'T change origin `message` case
    assert(proto.PascalCaseMessage);
    assert(proto.snake_case_message);
    assert(proto.camelCaseMessage);
    assert(proto.CONSTANT_CASE_MESSAGE);
    assert(proto.UPPERCASEMESSAGE);

    // WON'T change origin `enum` case
    assert(proto.Collect.PascalField === 0);
    assert(proto.Collect.snake_field === 1);
    assert(proto.Collect.camelField === 2);
    assert(proto.Collect.CONSTANT_CASE === 3);
    assert(proto.Collect.UPPERCASE === 4);

    // will change `rpc` method case
    assert(proto.TestService.service.pascalCase);
    assert(proto.TestService.service.snakeCase);
    assert(proto.TestService.service.camelCase);
    assert(proto.TestService.service.constantCase);
    assert(proto.TestService.service.uppercase);

    // will change `snake_field / CONSTANT_CASE`
    const item = new proto.Item({
      snakeField: 'a',
      camelField: 'b',
      PascalField: 'c',
      CONSTANTCASE: 'd',
      UPPERCASE: 'e',
    });
    item.setSnakeField('aa');
    item.setCamelField('bb');
    item.setPascalField('cc');
    item.setCONSTANTCASE('dd');
    item.setUPPERCASE('ee');
    assert.deepEqual(item, { snakeField: 'aa', camelField: 'bb', PascalField: 'cc', CONSTANTCASE: 'dd', UPPERCASE: 'ee' });
  });

});
