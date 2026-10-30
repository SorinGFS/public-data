'use strict';
// Verify project-specific reference resolution behavior and edge cases.
const { test } = require('node:test');
const assert = require('node:assert/strict');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id, { suite }) => {

    // Verify reference resolution behavior beyond the RFC's published examples.
    const resolveTests = [
        ['example:some:ip:prop', 'example:some:ip:prop', 'example:some:ip:prop'],
        ['example:some:ip:prop', 'example:some:other:prop', 'example:some:ip:prop'],
    ];

    suite('resolveReference', () => {
        // Register each project-specific reference case as an independently reported test.
        resolveTests.forEach(([reference, base, expected]) => {
            test(`resolveReference('${reference}', '${base}') === '${expected}'`, () => {
                const subject = id.resolveReference(reference, base);
                assert.equal(subject, expected);
            });
        });

        // Apply backward-compatible same-scheme handling with RFC case-insensitive scheme comparison.
        test('Resolves mixed-case same-scheme references in non-strict mode', () => {
            assert.equal(id.resolveReference('HTTP:g', 'http://a/b/c/d', false), 'http://a/b/c/g');
        });

        // Keep strict mode behavior unchanged when the reference repeats the base scheme.
        test('Retains mixed-case scheme references in strict mode', () => {
            assert.equal(id.resolveReference('HTTP:g', 'http://a/b/c/d', true), 'HTTP:g');
        });

        // Inherit an abnormal base path unchanged when the reference path is empty.
        test('Preserves inherited base dot segments for an empty reference', () => {
            assert.equal(id.resolveReference('', 'http://a/b/./c'), 'http://a/b/./c');
        });

        // Replace only the query while retaining the inherited base path verbatim.
        test('Preserves inherited base dot segments for a query-only reference', () => {
            assert.equal(id.resolveReference('?new', 'http://a/b/./c?old'), 'http://a/b/./c?new');
        });

        // Replace only the fragment while retaining the inherited base path and query verbatim.
        test('Preserves inherited base dot segments for a fragment-only reference', () => {
            assert.equal(id.resolveReference('#new', 'http://a/b/./c?query#old'), 'http://a/b/./c?query#new');
        });

        // Continue removing dot segments when the supplied reference path is non-empty.
        test('Removes dot segments from a non-empty reference path', () => {
            assert.equal(id.resolveReference('../target', 'http://a/b/./c'), 'http://a/target');
        });

        // Return the same inherited-path semantics through the component-object API.
        test('Returns inherited base dot segments as parts', () => {
            assert.deepEqual({ ...id.resolveReference('', 'http://a/b/./c?query#old', true, true) }, {
                scheme: 'http',
                authority: 'a',
                path: '/b/./c',
                query: 'query',
                fragment: undefined,
            });
        });

        // Preserve an explicitly empty query while replacing the base query.
        test('Preserves an empty query component', () => {
            assert.equal(id.resolveReference('?', 'https://example.com/path?old#fragment'), 'https://example.com/path?');
        });

        // Preserve an explicitly empty fragment after inheriting the base query.
        test('Preserves an empty fragment component', () => {
            assert.equal(id.resolveReference('#', 'https://example.com/path?query#old'), 'https://example.com/path?query#');
        });

        // Preserve an empty query inherited by an empty reference.
        test('Preserves an inherited empty query component', () => {
            assert.equal(id.resolveReference('', 'https://example.com/path?#fragment'), 'https://example.com/path?');
        });

        // Preserve the delimiter that distinguishes an empty authority from no authority.
        test('Preserves an empty authority component', () => {
            assert.equal(id.resolveReference('uri:///target', 'uri:/base'), 'uri:///target');
        });

        // Reject file resolution combinations that cannot produce supported file targets.
        const fileResolutionError = /^File reference resolution is not supported/;
        const fileResolutionPathError = 'File reference resolution is not supported for this base/reference path combination.';
        // Require operation-level errors without accepting parser SyntaxErrors.
        const assertFileResolutionError = (callback, message = fileResolutionError) => assert.throws(callback, { name: 'Error', message });
        const unsupportedFileReferences = [
            ['an empty query-only reference', '?', 'file:///base/item'],
            ['a query-only reference', '?query', 'file:///base/item'],
            ['authority userinfo', '//user@host/path', 'file:///base/item'],
            ['empty authority userinfo', '//@host/path', 'file:///base/item'],
            ['a numeric authority port', '//host:80/path', 'file:///base/item'],
            ['an empty authority port', '//host:/path', 'file:///base/item'],
            ['an IPv6 authority port', '//[::1]:80/path', 'file:///base/item'],
            ['an empty IPv6 authority port', '//[::1]:/path', 'file:///base/item'],
            ['an authority without an absolute path', '//host', 'file:///base/item'],
        ];
        // Report each unsupported operand combination independently.
        unsupportedFileReferences.forEach(([description, reference, base]) => {
            test(`Rejects ${description} with a file base`, () => {
                // Keep component-returning resolution subject to the same upfront policy.
                for (const returnParts of [false, true]) {
                    assertFileResolutionError(() => id.resolveReference(reference, base, true, returnParts));
                }
            });
        });

        // Apply the same canonical-authority restrictions to component-object references.
        test('Rejects unsupported file component-object authority combinations', () => {
            const base = { scheme: 'file', authority: '', path: '/base/item' };
            const references = [
                { authority: 'user@host', path: '/path' },
                { authority: '@host', path: '/path' },
                { authority: 'host:80', path: '/path' },
                { authority: 'host:', path: '/path' },
                { authority: '[::1]:80', path: '/path' },
                { authority: '[::1]:', path: '/path' },
                { authority: 'host', path: '' },
            ];
            // Exercise raw authority text without relying on optional parser captures.
            for (const reference of references) assertFileResolutionError(() => id.resolveReference(reference, base));
            assertFileResolutionError(() => id.resolveReference('child', { scheme: 'file', authority: 'host:', path: '/base/' }));
        });

        // Distinguish null-as-absent component input from present empty components.
        test('Preserves supported file component-object absence and canonical authority input', () => {
            const base = { scheme: 'file', authority: '', path: '/base/item' };
            assert.equal(id.resolveReference({ path: '', query: null, fragment: null }, base), 'file:///base/item');
            assert.equal(id.resolveReference({ authority: null, path: '/target' }, base), 'file:///target');
            assert.equal(id.resolveReference({ authority: '', path: '/target' }, base), 'file:///target');
            assert.equal(id.resolveReference({ authority: 'host', path: '/target' }, base), 'file://host/target');
            assertFileResolutionError(() => id.resolveReference({ path: '', query: '' }, base));
        });

        // Cover inherited queries on base objects that bypass the string parser.
        test('Rejects query components on a file base object', () => {
            // Treat empty and non-empty base queries as present in either return mode.
            for (const query of ['', 'query']) {
                const base = { scheme: 'file', authority: '', path: '/base/item', query };
                assertFileResolutionError(() => id.resolveReference('', base));
                assertFileResolutionError(() => id.resolveReference('', base, true, true));
            }
        });

        // Keep the component return mode and caller-owned operands intact for supported resolution.
        test('Returns file components without mutating operands', () => {
            const reference = { authority: 'server', path: '/a/../target', query: null, fragment: 'fragment' };
            const base = { scheme: 'file', authority: '', path: '/base/' };
            assert.deepEqual(id.resolveReference(reference, base, true, true), {
                scheme: 'file', authority: 'server', path: '/target', query: null, fragment: 'fragment',
            });
            assert.deepEqual(reference, { authority: 'server', path: '/a/../target', query: null, fragment: 'fragment' });
            assert.deepEqual(base, { scheme: 'file', authority: '', path: '/base/' });
        });

        // Retain supported file and generic reference combinations outside the new guard.
        test('Retains supported file resolution combinations', () => {
            const cases = [
                ['child', 'file:///base/', 'file:///base/child'],
                ['child', 'file:/base/', 'file:/base/child'],
                ['a//b', 'file:///base/', 'file:///base/a//b'],
                ['', 'file:///base/item', 'file:///base/item'],
                ['#fragment', 'file:///base/item', 'file:///base/item#fragment'],
                ['#', 'file:///base/item', 'file:///base/item#'],
                ['#?fragment', 'file:///base/item', 'file:///base/item#?fragment'],
                ['//[v1.a:b]/target', 'file:///base/item', 'file://[v1.a:b]/target'],
                ['child', 'file://server/base/', 'file://server/base/child'],
                ['child', 'file://192.0.2.1/base/', 'file://192.0.2.1/base/child'],
                ['child', 'file://[::1]/base/', 'file://[::1]/base/child'],
                ['child', 'file://[v1.a]/base/', 'file://[v1.a]/base/child'],
                ['child', 'file://host%40name/base/', 'file://host%40name/base/child'],
                ['child', 'file://host%3Aname/base/', 'file://host%3Aname/base/child'],
                ['http://example.com/target', 'file:///base/item', 'http://example.com/target'],
                ['https://example.com/target', 'file:///base/item', 'https://example.com/target'],
                ['https://example.com:8443/target?query#fragment', 'file:///base/item', 'https://example.com:8443/target?query#fragment'],
                ['file:///target', 'https://example.com:8443/base?query', 'file:///target'],
            ];
            // Preserve file resolution without imposing its restrictions on explicit non-file schemes.
            for (const [reference, base, expected] of cases) assert.equal(id.resolveReference(reference, base), expected);
            assert.equal(id.resolveReference('FiLe:/target', 'file:///base/item', false), 'file:///target');
            assert.equal(id.resolveReference('..//b', 'x:///base/'), 'x:////b');
        });

        // Check the final file target after RFC path merging and dot-segment removal.
        test('Rejects file paths that become unsupported during resolution', () => {
            const references = ['..//b', 'file:/a/..//b'];
            // Apply the post-calculation boundary to both target representations.
            for (const returnParts of [false, true]) {
                // Cover merged relative paths and complete file-reference paths.
                for (const reference of references) {
                    assertFileResolutionError(() => id.resolveReference(reference, 'file:///base/item', true, returnParts), fileResolutionPathError);
                }
            }
        });

        // Keep URN names outside generic hierarchical reference processing.
        test('Rejects URN bases and references', () => {
            assert.throws(() => id.resolveReference('', 'urn:example:a'), /URN reference resolution is not supported/);
            assert.throws(() => id.resolveReference('urn:example:a', 'https://example.com/base'), /URN reference resolution is not supported/);
        });

        // Check that the base URN rejection precedes parsing an invalid reference.
        test('Rejects a URN base before parsing its reference', () => {
            assert.throws(() => id.resolveReference('not a valid IRI', 'urn:example:a'), /URN reference resolution is not supported/);
        });
    });

};
