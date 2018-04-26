'use strict';

const mm = require('egg-mock');
const path = require('path');
const assert = require('assert');

describe('test/grpc.test.js', () => {
  let serverA;
  let serverB;
  let app;
  let ctx;
  let clientA;
  let clientB;
  before(function* () {
    app = mm.app({ baseDir: 'apps/multiple' });
    serverA = require(path.join(__dirname, 'fixtures/apps/multiple/grpc_server_a'))();
    serverB = require(path.join(__dirname, 'fixtures/apps/multiple/grpc_server_b'))();
    yield app.ready();
    ctx = app.mockContext();
    clientA = ctx.grpc.example.serviceA;
    clientB = ctx.grpc.example.serviceB;
  });

  after(done => serverA.tryShutdown(done));
  after(done => serverB.tryShutdown(done));
  after(() => app.close());
  afterEach(mm.restore);

  it('should GET /echoA', function* () {
    const response = yield app.httpRequest()
      .get('/echoA')
      .set('Accept', 'application/json')
      .expect(200);
    assert(response.body.id === 1);
    assert(response.body.msg === 'from server a');
    assert(response.body.originRequest.id === 1);
    assert(response.body.originRequest.userName === 'grpc');
  });

  it('should GET /echoB', function* () {
    const response = yield app.httpRequest()
      .get('/echoB')
      .set('Accept', 'application/json')
      .expect(200);
    assert(response.body.id === 1);
    assert(response.body.msg === 'from server b');
    assert(response.body.originRequest.id === 1);
    assert(response.body.originRequest.userName === 'grpc');
  });

  it('should echo a', function* () {
    const result = yield clientA.echo({ id: 1, userName: 'grpc' });
    assert(result.id === 1);
    assert(result.msg === 'from server a');
    assert(result.originRequest.id === 1);
    assert(result.originRequest.userName === 'grpc');
  });

  it('should echo b', function* () {
    const result = yield clientB.echo({ id: 1, userName: 'grpc' });
    assert(result.id === 1);
    assert(result.msg === 'from server b');
    assert(result.originRequest.id === 1);
    assert(result.originRequest.userName === 'grpc');
  });
});
