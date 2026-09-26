'use strict';
// Verify URI and IRI parsing against the canonical project implementation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id, { suite }) => {
    // Match Vitest's structural equality without requiring identical object prototypes.
    const assertParsedEqual = (actual, expected) => assert.deepEqual({ ...actual }, expected);

    // Match Vitest's Error-subclass and message-content checks.
    const assertError = (operation, message) => assert.throws(operation, (error) => error instanceof Error && error.message.includes(message));

    suite('parseUri', () => {
        test('Full', () => {
            assertParsedEqual(id.parseUri('https://jason@example.com:80/foo?bar#baz'), {
                scheme: 'https',
                authority: 'jason@example.com:80',
                userinfo: 'jason',
                host: 'example.com',
                port: '80',
                path: '/foo',
                query: 'bar',
                fragment: 'baz',
            });
        });

        test('No path with query', () => {
            assertParsedEqual(id.parseUri('https://example.org?bar'), {
                scheme: 'https',
                authority: 'example.org',
                userinfo: undefined,
                host: 'example.org',
                port: undefined,
                path: '',
                query: 'bar',
                fragment: undefined,
            });
        });

        test('No path with fragment', () => {
            assertParsedEqual(id.parseUri('https://example.org#baz'), {
                scheme: 'https',
                authority: 'example.org',
                userinfo: undefined,
                host: 'example.org',
                port: undefined,
                path: '',
                query: undefined,
                fragment: 'baz',
            });
        });

        test('Scheme is required', () => {
            assertError(() => id.parseUri('//example.com/foo?bar#baz'), 'Invalid URI: //example.com/foo?bar#baz');
        });

        test('No authority', () => {
            assertParsedEqual(id.parseUri('uri:/foo?bar#baz'), {
                scheme: 'uri',
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '/foo',
                query: 'bar',
                fragment: 'baz',
            });
        });

        test('Rootless path', () => {
            assertParsedEqual(id.parseUri('uri:foo?bar#baz'), {
                scheme: 'uri',
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: 'foo',
                query: 'bar',
                fragment: 'baz',
            });
        });

        test('Unicode is not allowed', () => {
            assertError(() => id.parseUri('http://examplé.org/rosé#'), 'Invalid URI: http://examplé.org/rosé#');
        });
    });

    suite('isUriReference', () => {
        test('Full', () => {
            assertParsedEqual(id.parseUriReference('https://jason@example.com:80/foo?bar#baz'), {
                scheme: 'https',
                authority: 'jason@example.com:80',
                userinfo: 'jason',
                host: 'example.com',
                port: '80',
                path: '/foo',
                query: 'bar',
                fragment: 'baz',
            });
        });

        test('No path with query', () => {
            assertParsedEqual(id.parseUriReference('https://example.org?bar'), {
                scheme: 'https',
                authority: 'example.org',
                userinfo: undefined,
                host: 'example.org',
                port: undefined,
                path: '',
                query: 'bar',
                fragment: undefined,
            });
        });

        test('No path with fragment', () => {
            assertParsedEqual(id.parseUriReference('https://example.org#baz'), {
                scheme: 'https',
                authority: 'example.org',
                userinfo: undefined,
                host: 'example.org',
                port: undefined,
                path: '',
                query: undefined,
                fragment: 'baz',
            });
        });

        test('No scheme with authority', () => {
            assertParsedEqual(id.parseUriReference('//example.com/foo?bar#baz'), {
                scheme: undefined,
                authority: 'example.com',
                userinfo: undefined,
                host: 'example.com',
                port: undefined,
                path: '/foo',
                query: 'bar',
                fragment: 'baz',
            });
        });

        test('No double slash', () => {
            assertParsedEqual(id.parseUriReference('example.com/foo?bar#baz'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: 'example.com/foo',
                query: 'bar',
                fragment: 'baz',
            });
        });

        test('No authority', () => {
            assertParsedEqual(id.parseUriReference('/foo?bar#baz'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '/foo',
                query: 'bar',
                fragment: 'baz',
            });
        });

        test('No path', () => {
            assertParsedEqual(id.parseUriReference('?bar#baz'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '',
                query: 'bar',
                fragment: 'baz',
            });
        });

        test('No query', () => {
            assertParsedEqual(id.parseUriReference('#baz'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '',
                query: undefined,
                fragment: 'baz',
            });
        });

        test('Empty', () => {
            assertParsedEqual(id.parseUriReference(''), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '',
                query: undefined,
                fragment: undefined,
            });
        });

        test('Unicode is not allowed', () => {
            assertError(() => id.parseUriReference('/rosé#'), 'Invalid URI-reference: /rosé#');
        });
    });

    suite('isAbsoluteUri', () => {
        test('Full', () => {
            assertParsedEqual(id.parseAbsoluteUri('https://jason@example.com:80/foo?bar'), {
                scheme: 'https',
                authority: 'jason@example.com:80',
                userinfo: 'jason',
                host: 'example.com',
                port: '80',
                path: '/foo',
                query: 'bar',
            });
        });

        test('Scheme is required', () => {
            assertError(() => id.parseAbsoluteUri('//example.com/foo?bar'), 'Invalid absolute-URI: //example.com/foo?bar');
        });

        test('Fragment is not allowed', () => {
            assertError(() => id.parseAbsoluteUri('https://example.com/foo?bar#baz'), 'Invalid absolute-URI: https://example.com/foo?bar#baz');
        });

        test('Unicode is not allowed', () => {
            assertError(() =>id. parseAbsoluteUri('http://examplé.org/rosé'), 'Invalid absolute-URI: http://examplé.org/rosé');
        });
    });

    suite('parseIri', () => {
        test('Full', () => {
            assertParsedEqual(id.parseIri('http://jásón@examplé.org:80/rosé?fóo#bár'), {
                scheme: 'http',
                authority: 'jásón@examplé.org:80',
                userinfo: 'jásón',
                host: 'examplé.org',
                port: '80',
                path: '/rosé',
                query: 'fóo',
                fragment: 'bár',
            });
        });

        test('No path with query', () => {
            assertParsedEqual(id.parseIri('http://examplé.org?fóo'), {
                scheme: 'http',
                authority: 'examplé.org',
                userinfo: undefined,
                host: 'examplé.org',
                port: undefined,
                path: '',
                query: 'fóo',
                fragment: undefined,
            });
        });

        test('No path with fragment', () => {
            assertParsedEqual(id.parseIri('http://examplé.org#bár'), {
                scheme: 'http',
                authority: 'examplé.org',
                userinfo: undefined,
                host: 'examplé.org',
                port: undefined,
                path: '',
                query: undefined,
                fragment: 'bár',
            });
        });

        test('Scheme is required', () => {
            assertError(() => id.parseIri('//examplé.com/rosé?fóo#bár'), 'Invalid IRI: //examplé.com/rosé?fóo#bár');
        });

        test('No authority', () => {
            assertParsedEqual(id.parseIri('uri:/rosé?fóo#bár'), {
                scheme: 'uri',
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '/rosé',
                query: 'fóo',
                fragment: 'bár',
            });
        });

        test('Rootless path', () => {
            assertParsedEqual(id.parseIri('uri:rosé?fóo#bár'), {
                scheme: 'uri',
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: 'rosé',
                query: 'fóo',
                fragment: 'bár',
            });
        });

        test('Unicode is not allowed in scheme', () => {
            assertError(() => id.parseIri('examplé://examplé.org/rosé'), 'Invalid IRI: examplé://examplé.org/rosé');
        });
    });

    suite('parseIriReference', () => {
        test('Full', () => {
            assertParsedEqual(id.parseIriReference('http://jásón@examplé.org:80/rosé?fóo#bár'), {
                scheme: 'http',
                authority: 'jásón@examplé.org:80',
                userinfo: 'jásón',
                host: 'examplé.org',
                port: '80',
                path: '/rosé',
                query: 'fóo',
                fragment: 'bár',
            });
        });

        test('No path with query', () => {
            assertParsedEqual(id.parseIriReference('http://examplé.org?fóo'), {
                scheme: 'http',
                authority: 'examplé.org',
                userinfo: undefined,
                host: 'examplé.org',
                port: undefined,
                path: '',
                query: 'fóo',
                fragment: undefined,
            });
        });

        test('No path with fragment', () => {
            assertParsedEqual(id.parseIriReference('http://examplé.org#bár'), {
                scheme: 'http',
                authority: 'examplé.org',
                userinfo: undefined,
                host: 'examplé.org',
                port: undefined,
                path: '',
                query: undefined,
                fragment: 'bár',
            });
        });

        test('No scheme with authority', () => {
            assertParsedEqual(id.parseIriReference('//examplé.org/rosé?fóo#bár'), {
                scheme: undefined,
                authority: 'examplé.org',
                userinfo: undefined,
                host: 'examplé.org',
                port: undefined,
                path: '/rosé',
                query: 'fóo',
                fragment: 'bár',
            });
        });

        test('No double slash', () => {
            assertParsedEqual(id.parseIriReference('examplé.org/rosé?fóo#bár'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: 'examplé.org/rosé',
                query: 'fóo',
                fragment: 'bár',
            });
        });

        test('No authority', () => {
            assertParsedEqual(id.parseIriReference('/rosé?fóo#bár'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '/rosé',
                query: 'fóo',
                fragment: 'bár',
            });
        });

        test('Rootless path', () => {
            assertParsedEqual(id.parseIriReference('rosé?fóo#bár'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: 'rosé',
                query: 'fóo',
                fragment: 'bár',
            });
        });

        test('Query and fragment', () => {
            assertParsedEqual(id.parseIriReference('?fóo#bár'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '',
                query: 'fóo',
                fragment: 'bár',
            });
        });

        test('Query only', () => {
            assertParsedEqual(id.parseIriReference('?fóo'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '',
                query: 'fóo',
                fragment: undefined,
            });
        });

        test('Fragment only', () => {
            assertParsedEqual(id.parseIriReference('#bár'), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '',
                query: undefined,
                fragment: 'bár',
            });
        });

        test('Empty', () => {
            assertParsedEqual(id.parseIriReference(''), {
                scheme: undefined,
                authority: undefined,
                userinfo: undefined,
                host: undefined,
                port: undefined,
                path: '',
                query: undefined,
                fragment: undefined,
            });
        });
    });

    suite('parseAbsoluteIri', () => {
        test('Full', () => {
            assertParsedEqual(id.parseAbsoluteIri('http://jásón:jásón@examplé.org:80/rosé?fóo'), {
                scheme: 'http',
                authority: 'jásón:jásón@examplé.org:80',
                userinfo: 'jásón:jásón',
                host: 'examplé.org',
                port: '80',
                path: '/rosé',
                query: 'fóo',
            });
        });

        test('Scheme is required', () => {
            assertError(() => id.parseAbsoluteIri('//examplé.org/rosé?fóo'), 'Invalid absolute-IRI: //examplé.org/rosé?fóo');
        });

        test('Fragment is not allowed', () => {
            assertError(() => id.parseAbsoluteIri('http://examplé.org/rosé?fóo#bár'), 'Invalid absolute-IRI: http://examplé.org/rosé?fóo#bár');
        });

        test('Unicode is not allowed in scheme', () => {
            assertError(() => id.parseAbsoluteIri('examplé://examplé.org/rosé'), 'Invalid absolute-IRI: examplé://examplé.org/rosé');
        });
    });

    // Verify that scheme-specific URN validation retains generic URI/IRI component output.
    suite('URN generic component parsing', () => {
        // Expose the RFC 3986 component boundaries rather than RFC 8141 subcomponents.
        test('returns generic components for complete URNs', () => {
            const expected = {
                scheme: 'URN',
                path: 'EXAMPLE:a%62/../c',
                query: '+r?x?=q?y',
                fragment: 'f',
            };
            // Apply the same component contract through each complete parser.
            for (const parser of ['parseUri', 'parseUriReference', 'parseIri', 'parseIriReference']) {
                assertParsedEqual(id[parser]('URN:EXAMPLE:a%62/../c?+r?x?=q?y#f'), expected);
            }
        });

        // Preserve generic component boundaries through fragment-free parser operations.
        test('returns generic components for absolute URNs', () => {
            const expected = {
                scheme: 'URN',
                path: 'EXAMPLE:a',
                query: '=q?+r?=still-q',
            };
            // Apply the same component contract through both absolute parsers.
            for (const parser of ['parseAbsoluteUri', 'parseAbsoluteIri']) {
                assertParsedEqual(id[parser]('URN:EXAMPLE:a?=q?+r?=still-q'), expected);
            }
        });

        // Preserve absent and present-empty generic fragment states.
        test('distinguishes absent and empty URN fragments', () => {
            assert.equal(id.parseUri('urn:example:a').fragment, undefined);
            assert.equal(id.parseUri('urn:example:a#').fragment, '');
        });
    });

};
