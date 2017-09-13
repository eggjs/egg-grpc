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

  it('should not reuse options when init client', function* () {
    let response = yield app.httpRequest().get('/echo');
    assert(response.body.originMeta['user-agent'].match(/grpc-node\/\d+\./g).length === 1);
    response = yield app.httpRequest().get('/echo');
    assert(response.body.originMeta['user-agent'].match(/grpc-node\/\d+\./g).length === 1);
  });

  it('should echoError', function* () {
    try {
      yield client.echoError({ id: 1, userName: 'grpc' });
      throw ('should not exec here');
    } catch (err) {
      assert(err.code === 444);
      assert(err.message.includes('this is an error'));
      assert.deepEqual(err.metadata.getMap(), { from: 'server' });
      // adjust error stack
      assert(err.stack.includes('Grpc Error: this is an error'));
      assert(err.stack.includes('GrpcSubClass._invokeUnaryRequest'));
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
      assert(err.message.includes('api=example.test.echoUnimplemented, code=12, UNIMPLEMENTED'));
    }
  });

  it('should echo with message instance', function* () {
    const TestRequest = app.grpcProto.example.TestRequest;

    assert(TestRequest === ctx.grpcProto.example.TestRequest);

    const data = new TestRequest({ id: 1 });
    data.setUserName('grpc');
    const result = yield client.echo(data);

    assert(result.id === 1);
    assert(result.msg === 'from server');
    assert(result.originRequest.id === 1);
    assert(result.originRequest.userName === 'grpc');
  });

  it('should echo with metadata json', function* () {
    const result = yield client.echo({ id: 1, userName: 'grpc' }, { key1: 'a', key2: 'b' }, {});

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
    const result = yield client.echo({ id: 1, userName: 'grpc' }, metadata, {});

    assert(result.originMeta.key1 === 'a');
  });

  it('should support 2 args, options as second args', function* () {
    try {
      // echo(data, options)
      yield client.echoTimeout({ id: 1, userName: 'grpc' }, { timeout: 100 });
      throw ('should not exec here');
    } catch (err) {
      assert(err.code === grpc.status.DEADLINE_EXCEEDED);
    }
  });

  it('should support 3 args', function* () {
    try {
      // echo(data, meta, options)
      yield client.echoTimeout({ id: 1, userName: 'grpc' }, {}, { timeout: 100 });
      throw ('should not exec here');
    } catch (err) {
      assert(err.code === grpc.status.DEADLINE_EXCEEDED);
    }
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

  it('should set x-real-ip and x-real-port', function* () {
    const result = yield client.echo({ id: 1, userName: 'grpc' });

    assert.ok(typeof result.originMeta['x-real-ip'] === 'string');
    assert.ok(typeof result.originMeta['x-real-port'] === 'string');
  });

  it('should set x-real-ip and x-real-port with request', function* () {
    const response = yield app.httpRequest()
      .get('/echo')
      .set('X-Real-IP', '123.123.123.123')
      .set('X-Real-Port', 6789)
      .expect(200);

    assert(response.body.originMeta['x-real-ip'] === '123.123.123.123');
    assert(response.body.originMeta['x-real-port'] === '6789');
  });

  it('should x-real-ip and x-real-port can not be covered', function* () {
    const result = yield client.echo({ id: 1, userName: 'grpc' }, {
      'x-real-ip': '123.123.123.123',
      'x-real-port': '6789',
    }, {});

    assert.ok(result.originMeta['x-real-ip'] !== '123.123.123.123');
    assert.ok(result.originMeta['x-real-port'] !== '6789');
  });
});
