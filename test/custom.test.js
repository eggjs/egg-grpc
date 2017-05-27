'use strict';

const mm = require('egg-mock');
const path = require('path');
const assert = require('assert');

describe('test/custom.test.js', () => {
  let server;
  let app;
  let ctx;
  let client;
  before(function* () {
    app = mm.app({ baseDir: 'apps/custom' });
    server = require(path.join(__dirname, 'fixtures/apps/custom/grpc_server'))();
    yield app.ready();
    ctx = app.mockContext();
    client = ctx.grpc.example.test;
  });

  after(done => server.tryShutdown(done));
  after(() => app.close());
  afterEach(mm.restore);

  it('should echo with request-id', function* () {
    const result = yield client.echo({ id: 1, userName: 'grpc' });
    assert(result.id === 1);
    assert(result.msg === 'from server');
    assert(result.originMeta['request-id'].startsWith('custom_caller_'));
  });
});
