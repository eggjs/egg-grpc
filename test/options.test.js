'use strict';

const mm = require('egg-mock');
const path = require('path');
const assert = require('assert');
const grpc = require('grpc');

describe('test/options.test.js', () => {
  let server;
  let app;
  let ctx;
  let client;
  before(function* () {
    app = mm.app({ baseDir: 'apps/example' });
    server = require(path.join(__dirname, 'fixtures/apps/example/grpc_server'))();
    yield app.ready();
    ctx = app.mockContext();
    client = ctx.grpc.example.test;
  });

  after(done => server.tryShutdown(done));
  after(() => app.close());
  afterEach(mm.restore);

  it('should echo with timeout', function* () {
    try {
      yield client.echoTimeout({ id: 1, userName: 'grpc' }, undefined, { timeout: 100 });
      throw ('should not exec here');
    } catch (err) {
      assert(err.code === grpc.status.DEADLINE_EXCEEDED);
    }
  });

  it('should echo with deadline', function* () {
    try {
      yield client.echoTimeout({ id: 1, userName: 'grpc' }, undefined, { deadline: Date.now() + 100 });
      throw ('should not exec here');
    } catch (err) {
      assert(err.code === grpc.status.DEADLINE_EXCEEDED);
    }
  });
});
