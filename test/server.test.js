'use strict';

const mm = require('egg-mock');
const path = require('path');
const assert = require('assert');
const grpc = require('grpc');
const cp = require('child_process');
const sleep = require('mz-modules/sleep');

function startServer(dir, host = '') {
  const bin = path.join(__dirname, 'fixtures/apps', dir, 'grpc_server.js');
  const child = cp.fork(bin, [], { stdio: [ 0, 1, 2, 'ipc' ]});
  child.once('disconnect', () => {
    console.log('disconnect');
  });
  child.on('close', (code, signal) => {
    console.log(
      `child process terminated due to receipt of signal ${signal}`);
  });
  return child;
}

describe.only('test/server.test.js', () => {
  describe('test/a.test.js', () => {
    let server;
    let app;
    let ctx;
    let client;
    before(function* () {
      app = mm.app({ baseDir: 'apps/example' });
      server = startServer('example');
      yield sleep('2s');
      yield app.ready();
      ctx = app.mockContext();
      client = ctx.grpc.example.test;
    });

    after(() => {
      server.kill();
      return sleep('2s');
    });
    after(() => app.close());
    afterEach(mm.restore);

    it.only('should echo', function* () {
      const result = yield client.echo({ id: 1, userName: 'grpc' });
      assert(result.id === 1);
    });
  });

  describe('test/b.test.js', () => {
    let server;
    let app;
    let ctx;
    let client;
    before(function* () {
      app = mm.app({ baseDir: 'apps/example' });
      server = startServer('example');
      yield sleep('2s');
      yield app.ready();
      ctx = app.mockContext();
      client = ctx.grpc.example.test;
    });

    after(() => {
      server.kill();
      return sleep('2s');
    });
    after(() => app.close());
    afterEach(mm.restore);

    it.only('should echo', function* () {
      const result = yield client.echo({ id: 1, userName: 'grpc' });
      assert(result.id === 1);
    });
  });

  describe('test/c.test.js', () => {
    let server;
    let app;
    let ctx;
    let client;
    before(function* () {
      app = mm.app({ baseDir: 'apps/example' });
      server = startServer('example');
      yield sleep('2s');
      yield app.ready();
      ctx = app.mockContext();
      client = ctx.grpc.example.test;
    });

    after(() => {
      server.kill();
      return sleep('2s');
    });
    after(() => app.close());
    afterEach(mm.restore);

    it.only('should echo', function* () {
      const result = yield client.echo({ id: 1, userName: 'grpc' });
      assert(result.id === 1);
    });
  });
});