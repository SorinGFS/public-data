'use strict';
// Verify generic URI, IRI, and UUID validation behavior.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id) => {
    // Match Vitest's Error-subclass and message-content checks.
    const assertError = (operation, message) => assert.throws(
        operation,
        (error) => error instanceof Error && error.message.includes(message),
    );


    describe('isUUID', () => {
        test('valid UUID with lowercase hex digits', () => {
            assert.equal(id.isUUID('123e4567-e89b-42d3-9456-426614174000'), true);
        });

        test('valid UUID with uppercase hex digits', () => {
            assert.equal(id.isUUID('123E4567-E89B-42D3-A456-426614174000'), true);
        });

        test('valid UUID with mixed case hex digits', () => {
            assert.equal(id.isUUID('123e4567-E89B-42d3-a456-426614174000'), true);
        });

        test('invalid UUID missing hyphens', () => {
            assertError(() => id.isUUID('123e4567e89b12d3a456426614174000'), 'Invalid UUID: 123e4567e89b12d3a456426614174000');
        });

        test('invalid UUID with extra hyphens', () => {
            assertError(() => id.isUUID('123e4567-e89b-12d3-a456-426-614174000'), 'Invalid UUID: 123e4567-e89b-12d3-a456-426-614174000');
        });

        test('invalid UUID with incorrect group lengths', () => {
            assertError(() => id.isUUID('123e4567-e89b-12d3-a456426614174000'), 'Invalid UUID: 123e4567-e89b-12d3-a456426614174000');
        });

        test('invalid UUID with non-hexadecimal characters', () => {
            assertError(() => id.isUUID('123e4567-e89b-12d3-g456-426614174000'), 'Invalid UUID: 123e4567-e89b-12d3-g456-426614174000');
        });

        test('invalid UUID string that is too short', () => {
            assertError(() => id.isUUID('123e4567-e89b-12d3-a456-42661417400'), 'Invalid UUID: 123e4567-e89b-12d3-a456-42661417400');
        });

        test('invalid UUID string that is too long', () => {
            assertError(() => id.isUUID('123e4567-e89b-12d3-a456-4266141740000'), 'Invalid UUID: 123e4567-e89b-12d3-a456-4266141740000');
        });

        test('valid UUID with all zeroes except version control chars', () => {
            assert.equal(id.isUUID('00000000-0000-4000-8000-000000000000'), true);
        });

        test('invalid UUID with missing section', () => {
            assertError(() => id.isUUID('2eb8aa08-aa98-11ea-73b441d16380'), 'Invalid UUID: 2eb8aa08-aa98-11ea-73b441d16380');
        });

        test('invalid UUID with too many dashes', () => {
            assertError(() => id.isUUID('2eb8-aa08-aa98-11ea-b4aa73b44-1d16380'), 'Invalid UUID: 2eb8-aa08-aa98-11ea-b4aa73b44-1d16380');
        });

        test('invalid UUID with dashes in the wrong spot', () => {
            assertError(() => id.isUUID('2eb8aa08aa9811eab4aa73b441d16380----'), 'Invalid UUID: 2eb8aa08aa9811eab4aa73b441d16380----');
        });

        test('valid UUID v5', () => {
            assert.equal(id.isUUID('99c17cbb-656f-564a-940f-1a4568f03487'), true);
        });

        test('valid UUID hypothetical v6', () => {
            assert.equal(id.isUUID('99c17cbb-656f-664a-940f-1a4568f03487'), true);
        });

        test('valid UUID hypothetical v15', () => {
            assert.equal(id.isUUID('99c17cbb-656f-f64a-940f-1a4568f03487'), true);
        });
    });

    describe('isUUIDv4', () => {
        test('valid UUID v4 with lowercase hex digits', () => {
            assert.equal(id.isUUIDv4('123e4567-e89b-42d3-9456-426614174000'), true);
        });

        test('valid UUID v4 with uppercase hex digits', () => {
            assert.equal(id.isUUIDv4('123E4567-E89B-42D3-A456-426614174000'), true);
        });

        test('valid UUID v4 with mixed case hex digits', () => {
            assert.equal(id.isUUIDv4('123e4567-E89B-42d3-a456-426614174000'), true);
        });

        test('invalid UUID v4 missing hyphens', () => {
            assertError(() => id.isUUIDv4('123e4567e89b12d3a456426614174000'), 'Invalid UUID-v4: 123e4567e89b12d3a456426614174000');
        });

        test('invalid UUID v4 with extra hyphens', () => {
            assertError(() => id.isUUIDv4('123e4567-e89b-12d3-a456-426-614174000'), 'Invalid UUID-v4: 123e4567-e89b-12d3-a456-426-614174000');
        });

        test('invalid UUID v4 with incorrect group lengths', () => {
            assertError(() => id.isUUIDv4('123e4567-e89b-12d3-a456426614174000'), 'Invalid UUID-v4: 123e4567-e89b-12d3-a456426614174000');
        });

        test('invalid UUID v4 with non-hexadecimal characters', () => {
            assertError(() => id.isUUIDv4('123e4567-e89b-12d3-g456-426614174000'), 'Invalid UUID-v4: 123e4567-e89b-12d3-g456-426614174000');
        });

        test('invalid UUID v4 string that is too short', () => {
            assertError(() => id.isUUIDv4('123e4567-e89b-12d3-a456-42661417400'), 'Invalid UUID-v4: 123e4567-e89b-12d3-a456-42661417400');
        });

        test('invalid UUID v4 string that is too long', () => {
            assertError(() => id.isUUIDv4('123e4567-e89b-12d3-a456-4266141740000'), 'Invalid UUID-v4: 123e4567-e89b-12d3-a456-4266141740000');
        });

        test('valid UUID v4 with all zeroes except version control chars', () => {
            assert.equal(id.isUUIDv4('00000000-0000-4000-8000-000000000000'), true);
        });

        test('invalid UUID v4 with missing section', () => {
            assertError(() => id.isUUIDv4('2eb8aa08-aa98-11ea-73b441d16380'), 'Invalid UUID-v4: 2eb8aa08-aa98-11ea-73b441d16380');
        });

        test('invalid UUID v4 with too many dashes', () => {
            assertError(() => id.isUUIDv4('2eb8-aa08-aa98-11ea-b4aa73b44-1d16380'), 'Invalid UUID-v4: 2eb8-aa08-aa98-11ea-b4aa73b44-1d16380');
        });

        test('invalid UUID v4 with dashes in the wrong spot', () => {
            assertError(() => id.isUUIDv4('2eb8aa08aa9811eab4aa73b441d16380----'), 'Invalid UUID-v4: 2eb8aa08aa9811eab4aa73b441d16380----');
        });
    });

    describe('isUri', () => {
        test('Full', () => {
            assert.equal(id.isUri('https://jason@example.com:80/foo?bar#baz'), true);
        });

        test('Scheme is required', () => {
            assertError(() => id.isUri('//example.com/foo?bar#baz'), 'Invalid URI: //example.com/foo?bar#baz');
        });

        test('No authority', () => {
            assert.equal(id.isUri('uri:/foo?bar#baz'), true);
        });

        test('No authority starting with double slash', () => {
            assertError(() => id.isUri('uri://12:34:56/foo?bar#baz'), 'Invalid URI: uri://12:34:56/foo?bar#baz');
        });

        test('Rootless path', () => {
            assert.equal(id.isUri('uri:foo?bar#baz'), true);
        });

        test('Unicode is not allowed', () => {
            assertError(() => id.isUri('http://examplé.org/rosé#'), 'Invalid URI: http://examplé.org/rosé#');
        });
    });

    describe('isUriReference', () => {
        test('Full', () => {
            assert.equal(id.isUriReference('https://jason@example.com:80/foo?bar#baz'), true);
        });

        test('No scheme with authority', () => {
            assert.equal(id.isUriReference('//example.com/foo?bar#baz'), true);
        });

        test('No double slash', () => {
            assert.equal(id.isUriReference('example.com/foo?bar#baz'), true);
        });

        test('No authority', () => {
            assert.equal(id.isUriReference('/foo?bar#baz'), true);
        });

        test('No path', () => {
            assert.equal(id.isUriReference('?bar#baz'), true);
        });

        test('No query', () => {
            assert.equal(id.isUriReference('#baz'), true);
        });

        test('Empty', () => {
            assert.equal(id.isUriReference(''), true);
        });

        test('Unicode is not allowed', () => {
            assertError(() => id.isUriReference('/rosé#'), 'Invalid URI-reference: /rosé#');
        });
    });

    describe('isAbsoluteUri', () => {
        test('Full', () => {
            assert.equal(id.isAbsoluteUri('https://jason@example.com:80/foo?bar'), true);
        });

        test('Scheme is required', () => {
            assertError(() => id.isAbsoluteUri('//example.com/foo?bar'), 'Invalid absolute-URI: //example.com/foo?bar');
        });

        test('Fragment is not allowed', () => {
            assertError(() => id.isAbsoluteUri('https://example.com/foo?bar#baz'), 'Invalid absolute-URI: https://example.com/foo?bar#baz');
        });

        test('Unicode is not allowed', () => {
            assertError(() => id.isAbsoluteUri('http://examplé.org/rosé'), 'Invalid absolute-URI: http://examplé.org/rosé');
        });
    });

    describe('isIri', () => {
        test('Full', () => {
            assert.equal(id.isIri('http://jásón@examplé.org:80/rosé?fóo#bár'), true);
        });

        test('Scheme is required', () => {
            assertError(() => id.isIri('//examplé.com/rosé?fóo#bár'), 'Invalid IRI: //examplé.com/rosé?fóo#bár');
        });

        test('No authority', () => {
            assert.equal(id.isIri('uri:/rosé?fóo#bár'), true);
        });

        test('No authority starting with double slash', () => {
            assertError(() => id.isIri('uri://12:23:45/rosé?fóo#bár'), 'Invalid IRI: uri://12:23:45/rosé?fóo#bár');
        });

        test('Rootless path', () => {
            assert.equal(id.isIri('uri:rosé?fóo#bár'), true);
        });

        test('Unicode is not allowed in scheme', () => {
            assertError(() => id.isIri('examplé://examplé.org/rosé'), 'Invalid IRI: examplé://examplé.org/rosé');
        });
    });

    describe('isIriReference', () => {
        test('Full', () => {
            assert.equal(id.isIriReference('http://jásón@examplé.org:80/rosé?fóo#bár'), true);
        });

        test('No scheme with authority', () => {
            assert.equal(id.isIriReference('//examplé.org/rosé?fóo#bár'), true);
        });

        test('No double slash', () => {
            assert.equal(id.isIriReference('examplé.org/rosé?fóo#bár'), true);
        });

        test('No authority', () => {
            assert.equal(id.isIriReference('/rosé?fóo#bár'), true);
        });

        test('Rootless path', () => {
            assert.equal(id.isIriReference('rosé?fóo#bár'), true);
        });

        test('No path', () => {
            assert.equal(id.isIriReference('?fóo#bár'), true);
        });

        test('No query', () => {
            assert.equal(id.isIriReference('#bár'), true);
        });

        test('Empty', () => {
            assert.equal(id.isIriReference(''), true);
        });
    });

    describe('isAbsoluteIri', () => {
        test('Full', () => {
            assert.equal(id.isAbsoluteIri('http://jásón@examplé.org:80/rosé?fóo'), true);
        });

        test('Scheme is required', () => {
            assertError(() => id.isAbsoluteIri('//examplé.org/rosé?fóo'), 'Invalid absolute-IRI: //examplé.org/rosé?fóo');
        });

        test('Fragment is not allowed', () => {
            assertError(() => id.isAbsoluteIri('http://examplé.org/rosé?fóo#bár'), 'Invalid absolute-IRI: http://examplé.org/rosé?fóo#bár');
        });

        test('Unicode is not allowed in scheme', () => {
            assertError(() => id.isAbsoluteIri('examplé://examplé.org/rosé'), 'Invalid absolute-IRI: examplé://examplé.org/rosé');
        });
    });

};
