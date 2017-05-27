'use strict';

const mm = require('egg-mock');
const path = require('path');
const assert = require('assert');
const grpc = require('grpc');
const pedding = require('pedding');

describe('test/stream.test.js', () => {
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

  describe('Client Stream', () => {
    it('should echoClientStream', done => {
      const step = [];
      // metadata -> callback -> status
      done = pedding(3, done);
      const stream = client.echoClientStream({ a: 'b' }, (err, response) => {
        // callback trigger after metadata before status
        assert.deepEqual(step, [ 1 ]);
        step.push(2);
        assert(response.msg === 'Server Received: [{"id":1,"userName":""},{"id":2,"userName":""},{"id":3,"userName":""}]');
        assert(response.originMeta.a === 'b');
        done(err);
      });

      stream.on('metadata', m => {
        // will trigger at fist
        step.push(1);
        assert(m.getMap().count === '3');
        done();
      });
      stream.on('status', status => {
        // will trigger at last
        assert.deepEqual(step, [ 1, 2 ]);
        assert(status.code === grpc.status.OK);
        assert(status.metadata.getMap().cost === '100ms');
        done();
      });
      stream.write({ id: 1 });
      stream.write({ id: 2 });
      stream.end({ id: 3 });
    });

    it('should support one args', done => {
      // rpc(fn)
      const stream = client.echoClientStream((err, response) => {
        assert(response.msg === 'Server Received: [{"id":1,"userName":""},{"id":2,"userName":""}]');
        done(err);
      });
      stream.write({ id: 1 });
      stream.end({ id: 2 });
    });

    it('should support three args', done => {
      // rpc(meta, opts, fn)
      const stream = client.echoClientStream({ a: 'b' }, { timeout: 300 }, err => {
        assert(err.code === grpc.status.DEADLINE_EXCEEDED);
        done();
      });
      stream.write({ id: 1 });
      stream.end({ id: 2 });
    });
  });

  describe('Server Stream', () => {
    it('should echoServerStream', done => {
      const step = [];
      const queue = [];
      // metadata -> data -> status -> end
      done = pedding(3, done);

      const stream = client.echoServerStream({ id: 1, userName: 'grpc' }, { from: 'client' });

      stream.on('data', data => {
        assert(data.originMeta.from === 'client');
        queue.push(data.msg);
      });
      stream.on('end', () => {
        // will trigger at last
        assert.deepEqual(step, [ 1, 2 ]);
        assert.deepEqual(queue, [ 'a', 'b' ]);
        done();
      });
      stream.on('metadata', m => {
        // will trigger at fist
        step.push(1);
        assert(m.getMap().from === 'server');
        done();
      });

      stream.on('status', status => {
        // callback trigger after metadata before end
        assert.deepEqual(step, [ 1 ]);
        step.push(2);
        assert(status.code === grpc.status.OK);
        assert(status.metadata.getMap().cost === '100ms');
        done();
      });
    });

    it('should support one args', done => {
      done = pedding(2, done);
      // rpc(data)
      const stream = client.echoServerStream({ id: 1, userName: 'grpc' });
      // must consume
      stream.on('data', data => {
        assert(data.msg);
        done();
      });
    });

    it('should support three args', done => {
      done = pedding(2, done);
      // rpc(data, meta, opts)
      const stream = client.echoServerStream({ id: 1, userName: 'grpc' }, { from: 'client' }, { timeout: 100 });
      // must consume
      stream.on('data', () => {
        throw 'should not trigger here';
      });
      stream.on('error', err => {
        assert(err.code === grpc.status.DEADLINE_EXCEEDED);
        done();
      });
      stream.on('status', status => {
        assert(status.code === grpc.status.DEADLINE_EXCEEDED);
        done();
      });
    });
  });

  describe('Bidi Stream', () => {
    it('should echoStreamStream', done => {
      const stream = client.echoStreamStream({ from: 'client' });
      const queue = [];
      stream.on('data', data => {
        assert(data.originMeta.from === 'client');
        queue.push(data.id);
      });
      stream.on('metadata', m => {
        // only trigger once
        assert(m.getMap().from === 'server');
      });
      stream.on('status', status => {
        assert(status.code === grpc.status.OK);
        assert(status.metadata.getMap().cost === '100ms');
      });
      stream.on('end', () => {
        assert.deepEqual(queue, [ 1, 2, 3 ]);
        done();
      });
      stream.write({ id: 1 });
      stream.write({ id: 2 });
      stream.end({ id: 3 });
    });

    it('should support two args', done => {
      done = pedding(2, done);
      // rpc(data, meta, opts)
      const stream = client.echoStreamStream({ from: 'client' }, { timeout: 100 });
      // must consume
      stream.on('data', data => {
        assert(data.originMeta.from === 'client');
      });
      stream.on('error', err => {
        assert(err.code === grpc.status.DEADLINE_EXCEEDED);
        done();
      });
      stream.on('status', status => {
        assert(status.code === grpc.status.DEADLINE_EXCEEDED);
        done();
      });

      stream.write({ id: 1 });
    });
  });
});
