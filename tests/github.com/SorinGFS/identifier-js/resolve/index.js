'use strict';
// Verify project-specific reference resolution behavior and edge cases.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id) => {

    // Verify reference resolution behavior beyond the RFC's published examples.
    const resolveTests = [
        ['urn:some:ip:prop', 'urn:some:ip:prop', 'urn:some:ip:prop'],
        ['urn:some:ip:prop', 'urn:some:other:prop', 'urn:some:ip:prop'],
    ];

    describe('resolveReference', () => {
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
    });

};
