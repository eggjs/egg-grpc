'use strict';

const mm = require('egg-mock');
const path = require('path');
const assert = require('assert');
const grpc = require('grpc');

describe('test/grpc.test.js', () => {
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

  it('should GET /echo', function* () {
    const response = yield app.httpRequest()
      .get('/echo')
      .set('Accept', 'application/json')
      .expect(200);
    assert(response.body.id === 1);
    assert(response.body.msg === 'from server');
    assert(response.body.originRequest.id === 1);
    assert(response.body.originRequest.userName === 'grpc');
  });

  it('should echo', function* () {
    const result = yield client.echo({ id: 1, userName: 'grpc' });
    assert(result.id === 1);
    assert(result.msg === 'from server');
    assert(result.originRequest.id === 1);
    assert(result.originRequest.userName === 'grpc');
  });

  it('should echoError', function* () {
    try {
      yield client.echoError({ id: 1, userName: 'grpc' });
      throw ('should not exec here');
    } catch (err) {
      assert(err.code === 444);
      assert(err.message.includes('this is an error'));
      assert.deepEqual(err.metadata.getMap(), { from: 'server' });
    }
  });

  it('should throw with invalid request field', function* () {
    try {
      yield client.echo({ abc: '123' });
      throw ('should not exec here');
    } catch (err) {
      assert(!err.code);
      assert(err.message === '.example.TestRequest#abc is not a field: undefined');
    }
  });

  it('should throw when rpc not exist', function* () {
    try {
      yield client.echoUnimplemented({ id: 1 });
      throw ('should not exec here');
    } catch (err) {
      assert(err.code === grpc.status.UNIMPLEMENTED);
      assert(err.message.includes('The server does not implement this method'));
    }
  });

  it('should echo with message instance', function* () {
    const TestRequest = app.grpcProto.example.TestRequest;
    const data = new TestRequest({ id: 1 });
    data.setUserName('grpc');
    const result = yield client.echo(data);

    assert(result.id === 1);
    assert(result.msg === 'from server');
    assert(result.originRequest.id === 1);
    assert(result.originRequest.userName === 'grpc');
  });

  it('should echo with metadata json', function* () {
    const result = yield client.echo({ id: 1, userName: 'grpc' }, { key1: 'a', key2: 'b' });

    assert(result.id === 1);
    assert(result.msg === 'from server');
    assert(result.originRequest.id === 1);
    assert(result.originRequest.userName === 'grpc');

    assert(result.originMeta.key1 === 'a');
    assert(result.originMeta.key2 === 'b');
  });

  it('should echo with metadata class', function* () {
    const metadata = new grpc.Metadata();
    metadata.set('key1', 'a');
    const result = yield client.echo({ id: 1, userName: 'grpc' }, metadata);

    assert(result.originMeta.key1 === 'a');
  });

  it('should echoComplex', function* () {
    const result = yield client.echoComplex({
      list: [{ id: 1 }, { id: 2 }],
      mapping: {
        a: { id: 1 },
        b: { id: 2 },
      },
    });

    assert.deepEqual(result, {
      list: [
        { id: 1, userName: 'a' },
        { id: 2, userName: 'b' },
      ],
      mapping: {
        a: { id: 1, userName: 'a' },
        b: { id: 2, userName: 'b' },
      },
    });
  });
});
