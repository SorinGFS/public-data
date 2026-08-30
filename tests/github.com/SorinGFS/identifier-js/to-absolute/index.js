'use strict';
// Verify conversion to absolute fragment-free references.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id) => {
    // Match Vitest's Error-subclass and message-content checks.
    const assertError = (operation, message) => assert.throws(
        operation,
        (error) => error instanceof Error && error.message.includes(message),
    );


    describe('toAbsoluteReference', () => {
        test('Base with a fragment', () => {
            assert.equal(id.toAbsoluteReference('http://examplé.org/rosé#dasd'), 'http://examplé.org/rosé');
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
    });

};
