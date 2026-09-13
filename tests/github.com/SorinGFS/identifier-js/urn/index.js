'use strict';
// Verify RFC 8141 URN syntax, scheme-specific captures, and parsed-result normalization.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

// Register URN concerns against the package API supplied by the root test entry point.
module.exports = (id) => {
    // Require a callback to reject an input with the package's syntax-error contract.
    const assertSyntaxError = (callback, value) => {
        assert.throws(() => id[callback](value), SyntaxError, `${callback} must reject ${JSON.stringify(value)}`);
    };

    // Exercise RFC 8141 namestring syntax through both URI and IRI validators.
    describe('URN validation', () => {
        const completeValidators = ['isUri', 'isUriReference', 'isIri', 'isIriReference'];
        const validNamestrings = [
            'urn:example:a123,z456',
            'URN:EXAMPLE:a123,z456',
            'urn:ab:a',
            `urn:a${'b'.repeat(30)}z:nss`,
            'urn:example:a/b/c',
            'urn:example:a?+abc',
            'urn:example:a?=xyz',
            'urn:example:a?+abc?=xyz',
            'urn:example:a?+r?x?=q?y',
            'urn:example:a?=q?+r',
            'urn:example:a#',
            'urn:example:a#?/fragment',
            'urn:example:a?+abc?=xyz#789',
        ];

        // Accept every complete URN form through operations whose grammar permits fragments.
        test('accepts complete namestring forms in URI and IRI operations', () => {
            // Check every complete-reference validator against every representative RFC form.
            for (const callback of completeValidators) {
                for (const value of validNamestrings) assert.equal(id[callback](value), true, `${callback} must accept ${value}`);
            }
        });

        // Accept URNs without f-components through the fragment-free grammar entry points.
        test('accepts fragment-free namestrings as absolute URI and IRI values', () => {
            const values = [
                'urn:example:a123,z456',
                'URN:EXAMPLE:a/b?+abc?=xyz',
            ];
            // Check both fragment-free grammar entry points against the same URN forms.
            for (const callback of ['isAbsoluteUri', 'isAbsoluteIri']) {
                for (const value of values) assert.equal(id[callback](value), true, `${callback} must accept ${value}`);
            }
        });

        // Reject f-components where the existing absolute operation excludes fragments.
        test('rejects an f-component from absolute URI and IRI values', () => {
            // Preserve the existing absolute-reference contract while recognizing URN syntax.
            for (const callback of ['isAbsoluteUri', 'isAbsoluteIri']) assertSyntaxError(callback, 'urn:example:a#fragment');
        });

        // Enforce the generic NID and non-empty NSS productions.
        test('rejects malformed NIDs and missing NSS values', () => {
            const invalid = [
                'urn:a:nss',
                `urn:a${'b'.repeat(31)}z:nss`,
                'urn:-ab:nss',
                'urn:ab-:nss',
                'urn::nss',
                'urn:example:',
                'urn:example:/nss',
            ];
            // Apply the scheme grammar consistently through URI and IRI validation.
            for (const callback of ['isUri', 'isIri']) {
                for (const value of invalid) assertSyntaxError(callback, value);
            }
        });

        // Enforce the introducer, ordering, and non-empty-value rules for r- and q-components.
        test('rejects invalid optional-component delimiters and empty components', () => {
            const invalid = [
                'urn:example:a?',
                'urn:example:a?ordinary',
                'urn:example:a?+',
                'urn:example:a?+?x',
                'urn:example:a?+/x',
                'urn:example:a?=',
                'urn:example:a?=/x',
                'urn:example:a?+r?=',
            ];
            // Require each introducer to be followed by the RFC-defined non-empty component.
            for (const callback of ['isUri', 'isIri']) {
                for (const value of invalid) assertSyntaxError(callback, value);
            }
        });

        // Keep every URN component within its ASCII and percent-encoding repertoire.
        test('rejects invalid characters and malformed percent triplets', () => {
            const invalid = [
                'urn:example:a[',
                'urn:example:a%2',
                'urn:example:a%GG',
                'urn:example:café',
                'urn:example:a?+résolution',
                'urn:example:a?=quête',
                'urn:example:a#résultat',
            ];
            // Enforce the ASCII URN transport syntax even through IRI entry points.
            for (const callback of ['isUri', 'isIri']) {
                for (const value of invalid) assertSyntaxError(callback, value);
            }
        });

        // Prevent the implemented scheme from bypassing its profile through generic URI alternatives.
        test('does not let malformed implemented URNs fall back to generic URI syntax', () => {
            // These values satisfy broader generic shapes but violate the implemented URN scheme grammar.
            for (const value of ['urn://example/a', 'urn:example:a?query', 'urn:example:']) {
                assertSyntaxError('isUriReference', value);
                assertSyntaxError('isIriReference', value);
            }
        });
    });

    // Verify scheme-native fields without adding generic URI component aliases.
    describe('URN parsing', () => {
        // Expose each RFC 8141 field directly from its production capture.
        test('captures assigned-name and optional components', () => {
            const parsed = id.parseUri('URN:EXAMPLE:a%62/../c?+foo?=bar#frag');
            assert.equal(parsed.scheme, 'URN');
            assert.equal('path' in parsed, false);
            assert.equal('query' in parsed, false);
            assert.equal(parsed.nid, 'EXAMPLE');
            assert.equal(parsed.nss, 'a%62/../c');
            assert.equal(parsed.rComponent, 'foo');
            assert.equal(parsed.qComponent, 'bar');
            assert.equal(parsed.fragment, 'frag');
        });

        // Terminate r-component data at the first q-component introducer.
        test('captures the first q-component delimiter after r-component data', () => {
            const parsed = id.parseIri('urn:example:a?+r?x?=q?y#f');
            assert.equal(parsed.rComponent, 'r?x');
            assert.equal(parsed.qComponent, 'q?y');
        });

        // Retain later question marks as ordinary q-component data.
        test('treats question-mark text after a q-component as q-component data', () => {
            const parsed = id.parseUri('urn:example:a?=q?+r?=still-q');
            assert.equal(parsed.rComponent, undefined);
            assert.equal(parsed.qComponent, 'q?+r?=still-q');
        });

        // Preserve optional-component presence, including the legal empty f-component.
        test('distinguishes absent optional components from an empty f-component', () => {
            const plain = id.parseUri('urn:example:a');
            assert.equal(plain.rComponent, undefined);
            assert.equal(plain.qComponent, undefined);
            assert.equal(plain.fragment, undefined);
            const fragmented = id.parseUri('urn:example:a#');
            assert.equal(fragmented.fragment, '');
        });

        // Select the URN profile through each complete or fragment-free parser.
        test('provides URN captures through every applicable parser entry point', () => {
            const cases = [
                ['parseUri', 'urn:example:a#f'],
                ['parseUriReference', 'urn:example:a#f'],
                ['parseAbsoluteUri', 'urn:example:a?=q'],
                ['parseIri', 'urn:example:a#f'],
                ['parseIriReference', 'urn:example:a#f'],
                ['parseAbsoluteIri', 'urn:example:a?=q'],
            ];
            // Verify profile selection independently for every compiled parser rule.
            for (const [callback, value] of cases) {
                const parsed = id[callback](value);
                assert.equal(parsed.nid, 'example', `${callback} must expose the NID`);
                assert.equal(parsed.nss, 'a', `${callback} must expose the NSS`);
                assert.equal(typeof parsed.normalize, 'function', `${callback} must expose chained normalization`);
            }
        });

        // Retain the common parsed-result method's non-enumerable interface.
        test('keeps chained normalization non-enumerable', () => {
            const parsed = id.parseUri('urn:example:a');
            assert.equal(Object.keys(parsed).includes('normalize'), false);
        });
    });

    // Verify the conservative scheme-based normalization required for URN assigned names.
    describe('URN parsed-result normalization', () => {
        // Apply conservative case normalization without changing encoded assigned-name octets.
        test('normalizes scheme, NID, and percent-triplet case without decoding', () => {
            const input = 'URN:EXAMPLE:a%62%2c%7e/../B?+r%65s%2f?=q%75ery%2f#fr%61g%2f';
            const expected = 'urn:example:a%62%2C%7E/../B?+r%65s%2F?=q%75ery%2F#fr%61g%2F';
            assert.equal(id.parseUri(input).normalize(), expected);
        });

        // Keep encoded unreserved NSS octets distinct from literal characters.
        test('preserves every percent-encoded ASCII unreserved NSS octet', () => {
            const encoded = '%41%7a%30%2d%2e%5f%7e';
            assert.equal(id.parseUri(`urn:example:${encoded}`).normalize(), `urn:example:%41%7A%30%2D%2E%5F%7E`);
        });

        // Treat NSS slash and dot-segment spelling as opaque assigned-name data.
        test('preserves NSS dot segments, slash structure, and case', () => {
            assert.equal(id.parseUri('URN:EXAMPLE:A/./b/../C').normalize(), 'urn:example:A/./b/../C');
        });

        // Prevent representation options from introducing literal Unicode into URN syntax.
        test('retains the ASCII URN representation for URI and IRI transforms', () => {
            const parsed = id.parseIri('URN:EXAMPLE:caf%c3%a9?=q%c3%a9#f%c3%a9');
            const expected = 'urn:example:caf%C3%A9?=q%C3%A9#f%C3%A9';
            assert.equal(parsed.normalize({ transform: 'URI' }), expected);
            assert.equal(parsed.normalize({ transform: 'IRI' }), expected);
        });

        // Keep authority-specific mapping outside the URN normalization path.
        test('does not invoke registered-name mapping for an authority-free URN', () => {
            let calls = 0;
            // Detect any accidental routing through generic host normalization.
            const mapRegName = (value) => {
                calls++;
                return value;
            };
            assert.equal(id.parseIri('URN:EXAMPLE:a').normalize({ mapRegName }), 'urn:example:a');
            assert.equal(calls, 0);
        });

        // Read scheme-native mutable fields as the authoritative normalization input.
        test('reads mutable URN fields without modifying the parsed result', () => {
            const parsed = id.parseUri('urn:example:original?+old-r?=old-q#old-f');
            parsed.nid = 'CHANGED';
            parsed.nss = 'A%62/../C';
            parsed.rComponent = 'new%2fr';
            parsed.qComponent = 'new%2fq';
            parsed.fragment = 'new%2ff';
            const components = { ...parsed };
            assert.equal(parsed.normalize(), 'urn:changed:A%62/../C?+new%2Fr?=new%2Fq#new%2Ff');
            assert.deepEqual({ ...parsed }, components);
        });

        // Reach a fixed point while preserving the parser's original component values.
        test('is idempotent and leaves components unchanged', () => {
            const parsed = id.parseUri('URN:EXAMPLE:a%62/./b?+r%2f?=q%2f#f%2f');
            const components = { ...parsed };
            const normalized = parsed.normalize();
            assert.equal(id.parseUri(normalized).normalize(), normalized);
            assert.deepEqual({ ...parsed }, components);
        });
    });
};
