'use strict';
// Verify conversion to absolute fragment-free references.
const { test } = require('node:test');
const assert = require('node:assert/strict');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id, { suite }) => {
    // Match Vitest's Error-subclass and message-content checks.
    const assertError = (operation, message) => assert.throws(operation, (error) => error instanceof Error && error.message.includes(message));

    suite('toAbsoluteReference', () => {
        test('Base with a fragment', () => {
            assert.equal(id.toAbsoluteReference('http://examplé.org/rosé#dasd'), 'http://examplé.org/rosé');
        });

        // Preserve path spelling because absolute conversion removes only the fragment.
        test('Base with dot segments', () => {
            assert.equal(id.toAbsoluteReference('http://examplé.org/a/../rosé#dasd'), 'http://examplé.org/a/../rosé');
        });

        test('Base with empty path', () => {
            assert.equal(id.toAbsoluteReference('http://examplé.org'), 'http://examplé.org');
        });

        test('Base witout authority', () => {
            assert.equal(id.toAbsoluteReference('http:/foo?bar#baz'), 'http:/foo?bar');
        });

        test('Base witout authority and empty path', () => {
            assert.equal(id.toAbsoluteReference('http:?bar#baz'), 'http:?bar');
        });

        test('Base witout authority or query and empty path', () => {
            assert.equal(id.toAbsoluteReference('http:#baz'), 'http:');
        });

        test('Scheme is required', () => {
            assertError(() => id.toAbsoluteReference('//example.com/foo?bar#baz'), 'Invalid IRI: //example.com/foo?bar#baz');
        });

        // Keep URN names outside generic reference conversion.
        test('URN conversion is not supported', () => {
            assertError(() => id.toAbsoluteReference('urn:example:a#fragment'), 'URN reference conversion is not supported');
        });
    });

};
