'use strict';
// Exercise shared-http-cache through deterministic local HTTP origins and isolated cacache stores.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const SharedHttpCache = require('../../../index.js');

// Run one test against an isolated local origin and remove every temporary resource afterward.
async function withEnvironment(handler, options, operation) {
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shared-http-cache-test-'));
    const server = http.createServer(handler);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const cache = new SharedHttpCache({ cacheDir, awaitStorage: true, ...options });
    try {
        return await operation({ baseUrl, cache, cacheDir });
    } finally {
        await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
        await fs.rm(cacheDir, { recursive: true, force: true });
    }
}

// Create an SRI value for known-integrity request scenarios.
function integrity(algorithm, content) {
    return `${algorithm}-${createHash(algorithm).update(content).digest('base64')}`;
}

// Verify ordinary responses are stored once and callbacks receive plain header objects.
test('stores and reuses an ordinary fresh response', async () => {
    let originRequests = 0;
    await withEnvironment(
        (request, response) => {
            originRequests += 1;
            response.writeHead(200, { 'Cache-Control': 'max-age=60', 'Content-Type': 'text/plain' });
            response.end('ordinary');
        },
        {},
        async ({ baseUrl, cache }) => {
            const observations = [];
            const callback = ({ buffer, headers, fromCache }) => observations.push({ body: buffer.toString(), contentType: headers['content-type'], hasGet: typeof headers.get === 'function', fromCache });
            await cache.fetch([{ url: `${baseUrl}/ordinary`, callback }]);
            await cache.fetch([{ url: `${baseUrl}/ordinary`, callback }]);
            assert.equal(originRequests, 1);
            assert.deepEqual(observations, [
                { body: 'ordinary', contentType: 'text/plain', hasGet: false, fromCache: false },
                { body: 'ordinary', contentType: 'text/plain', hasGet: false, fromCache: true },
            ]);
        },
    );
});

// Verify min-fresh rejects entries that are fresh for less than the requested duration.
test('applies min-fresh to the remaining freshness lifetime', async () => {
    let originRequests = 0;
    await withEnvironment(
        (request, response) => {
            originRequests += 1;
            response.writeHead(200, { 'Cache-Control': 'max-age=100' });
            response.end(`response-${originRequests}`);
        },
        {},
        async ({ baseUrl, cache, cacheDir }) => {
            const url = `${baseUrl}/min-fresh`;
            const sources = [];
            await cache.fetch([{ url, callback: ({ fromCache }) => sources.push(fromCache) }]);
            const file = await cache.store.get.info(cacheDir, url);
            const originalNow = Date.now;
            Date.now = () => file.time + 90_000;
            try {
                await cache.fetch([{ url, options: { headers: { 'Cache-Control': 'min-fresh=5' } }, callback: ({ fromCache }) => sources.push(fromCache) }]);
                await cache.fetch([{ url, options: { headers: { 'Cache-Control': 'min-fresh=30' } }, callback: ({ fromCache }) => sources.push(fromCache) }]);
            } finally {
                Date.now = originalNow;
            }
            assert.equal(originRequests, 2);
            assert.deepEqual(sources, [false, true, false]);
        },
    );
});

// Verify generated cacache integrity can become the strict identity for later cache reads.
test('reuses a generated digest without returning to the origin', async () => {
    let originRequests = 0;
    await withEnvironment(
        (request, response) => {
            originRequests += 1;
            response.writeHead(200, { 'Cache-Control': 'max-age=60' });
            response.end('trusted-source');
        },
        {},
        async ({ baseUrl, cache, cacheDir }) => {
            const url = `${baseUrl}/generated-integrity`;
            await cache.fetch([{ url }]);
            const file = await cache.store.get.info(cacheDir, url);
            let cachedBody;
            await cache.fetch([{ url, integrity: String(file.integrity), callback: ({ buffer, fromCache }) => { cachedBody = { body: buffer.toString(), fromCache }; } }]);
            assert.equal(originRequests, 1);
            assert.deepEqual(cachedBody, { body: 'trusted-source', fromCache: true });
        },
    );
});

// Verify known integrity is enforced by Fetch on origin access and by cacache on reuse.
test('enforces a caller-supplied integrity identity', async () => {
    let originRequests = 0;
    const body = 'known-integrity';
    const expected = integrity('sha256', body);
    const incorrect = integrity('sha256', 'different');
    await withEnvironment(
        (request, response) => {
            originRequests += 1;
            response.writeHead(200, { 'Cache-Control': 'max-age=60' });
            response.end(body);
        },
        {},
        async ({ baseUrl, cache }) => {
            const validUrl = `${baseUrl}/known-integrity`;
            await cache.fetch([{ url: validUrl, integrity: expected }]);
            await cache.fetch([{ url: validUrl, integrity: expected }]);
            await assert.rejects(cache.fetch([{ url: `${baseUrl}/integrity-mismatch`, integrity: incorrect }]), (errors) => errors.length === 1 && errors[0].error instanceof Error);
            assert.equal(originRequests, 2);
        },
    );
});

// Verify conditional revalidation reuses integrity-checked content and refreshes metadata.
test('handles a 304 revalidation with the cached body', async () => {
    let originRequests = 0;
    await withEnvironment(
        (request, response) => {
            originRequests += 1;
            if (request.headers['if-none-match'] === '"revision-1"') {
                response.writeHead(304, { ETag: '"revision-1"', 'Cache-Control': 'max-age=60' });
                return response.end();
            }
            response.writeHead(200, { ETag: '"revision-1"', 'Cache-Control': 'max-age=0' });
            response.end('revision-1');
        },
        {},
        async ({ baseUrl, cache }) => {
            const url = `${baseUrl}/revalidate`;
            const bodies = [];
            await cache.fetch([{ url, callback: ({ buffer }) => bodies.push(buffer.toString()) }]);
            await cache.fetch([{ url, options: { headers: { 'Cache-Control': 'no-cache' } }, callback: ({ buffer }) => bodies.push(buffer.toString()) }]);
            assert.equal(originRequests, 2);
            assert.deepEqual(bodies, ['revision-1', 'revision-1']);
        },
    );
});

// Verify detached storage preserves content delivery and reports a later write rejection.
test('reports detached storage failures through onStorageError', async () => {
    await withEnvironment(
        (request, response) => response.end('detached'),
        { awaitStorage: false },
        async ({ baseUrl, cache }) => {
            const writeError = new Error('write failed');
            let notify;
            const notification = new Promise((resolve) => { notify = resolve; });
            const get = async () => ({ data: Buffer.from('cached') });
            get.info = async () => null;
            cache.onStorageError = notify;
            cache.store = { get, put: async () => { throw writeError; }, rm: { entry: async () => {}, content: async () => {} } };
            let delivered;
            await cache.fetch([{ url: `${baseUrl}/detached`, callback: ({ buffer }) => { delivered = buffer.toString(); } }]);
            const failure = await notification;
            assert.equal(delivered, 'detached');
            assert.equal(failure.error, writeError);
            assert.equal(failure.index, 0);
        },
    );
});

// Verify detached failures and rejected custom handlers remain visible as process warnings.
test('warns when detached storage has no successful custom handler', async () => {
    await withEnvironment(
        (request, response) => response.end('warning'),
        { awaitStorage: false },
        async ({ baseUrl, cache }) => {
            const originalEmitWarning = process.emitWarning;
            const get = async () => ({ data: Buffer.from('cached') });
            get.info = async () => null;
            cache.store = { get, put: async () => { throw new Error('write failed'); }, rm: { entry: async () => {}, content: async () => {} } };
            try {
                let notify;
                const defaultWarning = new Promise((resolve) => { notify = resolve; });
                process.emitWarning = notify;
                await cache.fetch([{ url: `${baseUrl}/default-warning` }]);
                assert.match((await defaultWarning).message, /write failed/);

                const handlerError = new Error('handler failed');
                const handlerWarning = new Promise((resolve) => { notify = resolve; });
                process.emitWarning = notify;
                cache.onStorageError = async () => { throw handlerError; };
                await cache.fetch([{ url: `${baseUrl}/handler-warning` }]);
                assert.equal(await handlerWarning, handlerError);
            } finally {
                process.emitWarning = originalEmitWarning;
            }
        },
    );
});

// Verify awaited storage remains part of fetch error reporting instead of using the detached handler.
test('rejects fetch when awaited storage fails', async () => {
    await withEnvironment(
        (request, response) => response.end('awaited'),
        { awaitStorage: true },
        async ({ baseUrl, cache }) => {
            const writeError = new Error('write failed');
            let handlerCalled = false;
            const get = async () => ({ data: Buffer.from('cached') });
            get.info = async () => null;
            cache.onStorageError = () => { handlerCalled = true; };
            cache.store = { get, put: async () => { throw writeError; }, rm: { entry: async () => {}, content: async () => {} } };
            await assert.rejects(cache.fetch([{ url: `${baseUrl}/awaited` }]), (errors) => errors.length === 1 && errors[0].error === writeError);
            assert.equal(handlerCalled, false);
        },
    );
});

// Verify unsafe response forms are delivered but excluded from URL-keyed storage.
test('does not store partial, Content-Range, Set-Cookie, or Vary-star responses', async () => {
    await withEnvironment(
        (request, response) => {
            response.setHeader('Cache-Control', 'max-age=60');
            if (request.url === '/partial') {
                response.statusCode = 206;
                response.setHeader('Content-Range', 'bytes 0-4/10');
                return response.end('01234');
            }
            if (request.url === '/content-range') {
                response.setHeader('Content-Range', 'bytes 0-4/10');
                return response.end('01234');
            }
            if (request.url === '/cookie') {
                response.setHeader('Set-Cookie', 'session=example; Path=/');
                return response.end('cookie');
            }
            if (request.url === '/vary-star') {
                response.setHeader('Vary', '*');
                return response.end('vary');
            }
            if (request.url === '/range-full') {
                assert.equal(request.headers.range, 'bytes=0-4');
                return response.end('0123456789');
            }
            response.end('ordinary');
        },
        {},
        async ({ baseUrl, cache, cacheDir }) => {
            const excluded = ['partial', 'content-range', 'cookie', 'vary-star'];
            const controls = ['ordinary', 'range-full'];
            const names = [...excluded, ...controls];
            const delivered = [];
            await cache.fetch(names.map((name) => ({ url: `${baseUrl}/${name}`, options: ['partial', 'range-full'].includes(name) ? { headers: { Range: 'bytes=0-4' } } : undefined, callback: ({ buffer }) => delivered.push(buffer.toString()) })));
            // Confirm exclusions have no URL index entry while complete control responses do.
            for (const name of excluded) assert.equal(await cache.store.get.info(cacheDir, `${baseUrl}/${name}`), null);
            for (const name of controls) assert.ok(await cache.store.get.info(cacheDir, `${baseUrl}/${name}`));
            assert.equal(delivered.length, names.length);
        },
    );
});

// Verify non-star Vary values remain a documented URL-key boundary owned by callers.
test('uses the URL entry for non-star Vary responses', async () => {
    let originRequests = 0;
    await withEnvironment(
        (request, response) => {
            originRequests += 1;
            response.writeHead(200, { 'Cache-Control': 'max-age=60', Vary: 'Accept-Language' });
            response.end(request.headers['accept-language'] || 'none');
        },
        {},
        async ({ baseUrl, cache }) => {
            const url = `${baseUrl}/language`;
            const bodies = [];
            await cache.fetch([{ url, options: { headers: { 'Accept-Language': 'en' } }, callback: ({ buffer }) => bodies.push(buffer.toString()) }]);
            await cache.fetch([{ url, options: { headers: { 'Accept-Language': 'fr' } }, callback: ({ buffer }) => bodies.push(buffer.toString()) }]);
            assert.equal(originRequests, 1);
            assert.deepEqual(bodies, ['en', 'en']);
        },
    );
});
