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
