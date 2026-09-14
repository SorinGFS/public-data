'use strict';
// Verify scheme-specific hostname validation policies.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id) => {
    // Match Vitest's Error-subclass and message-content checks.
    const assertError = (operation, message) => assert.throws(operation, (error) => error instanceof Error && error.message.includes(message));

    describe('isUri with hostnames', () => {
        test('Valid character ! (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa!mple'), true);
        });

        test('Valid character & (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa&mple'), true);
        });

        test('Valid character $ (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa$mple'), true);
        });

        test("Valid character ' (sub-delims) in uri reg_name", () => {
            assert.equal(id.isUri("uri://exa'mple"), true);
        });

        test('Valid character ( (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa(mple'), true);
        });

        test('Valid character ) (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa)mple'), true);
        });

        test('Valid character * (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa*mple'), true);
        });

        test('Valid character + (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa+mple'), true);
        });

        test('Valid character , (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa,mple'), true);
        });

        test('Valid character ; (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa;mple'), true);
        });

        test('Valid character = (sub-delims) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa=mple'), true);
        });

        test('Valid character - (unreserved) anywhere in uri reg_name', () => {
            assert.equal(id.isUri('iri://-exa-mple-'), true);
        });

        test('Valid character . multiple times (unreserved) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa..mple'), true);
        });

        test('Valid character ~ (unreserved) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa~mple'), true);
        });

        test('Valid character _ (unreserved) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa_mple'), true);
        });

        test('Valid character %20 (pct-encoded) in uri reg_name', () => {
            assert.equal(id.isUri('uri://exa%20mple'), true);
        });

        test('Invalid %GG (pct-encoded) in uri reg_name', () => {
            assertError(() => id.isUri('uri://exa%GGmple'), 'Invalid URI: uri://exa%GGmple');
        });

        test('Valid label - alphanumeric', () => {
            assert.equal(id.isUri('https://example'), true);
        });

        test('Valid label - hyphen in middle', () => {
            assert.equal(id.isUri('https://exa-mple'), true);
        });

        test('Invalid label - hyphen at start', () => {
            assertError(() => id.isUri('https://-example'), 'Invalid URI: https://-example');
        });

        test('Invalid label - hyphen at end', () => {
            assertError(() => id.isUri('https://example-'), 'Invalid URI: https://example-');
        });

        test('Valid multiple labels', () => {
            assert.equal(id.isUri('https://example-domain.com'), true);
        });

        test('Invalid - leading dot', () => {
            assertError(() => id.isUri('https://.example.com'), 'Invalid URI: https://.example.com');
        });

        // Accept the RFC 3986 DNS form with one terminal root dot for every DNS-host URI scheme.
        test('Valid - terminal DNS root dot', () => {
            // Exercise each scheme that specializes registered names as DNS hosts.
            for (const scheme of ['http', 'https', 'ws', 'wss', 'file']) {
                const absoluteInput = `${scheme}://example.com.:8443/path?query`;
                const input = absoluteInput + '#fragment';
                const parsed = id.parseUri(input);
                assert.equal(id.isUri(input), true);
                assert.equal(id.isUriReference(input), true);
                assert.equal(id.isAbsoluteUri(absoluteInput), true);
                assert.equal(parsed.host, 'example.com.');
                assert.equal(id.parseUriReference(input).host, 'example.com.');
                assert.equal(id.parseAbsoluteUri(absoluteInput).host, 'example.com.');
            }
        });

        // Reject empty non-root label positions even when one terminal root dot is otherwise allowed.
        test('Invalid - root-only or consecutive dots', () => {
            assertError(() => id.isUri('https://.'), 'Invalid URI: https://.');
            assertError(() => id.isUri('https://example..com'), 'Invalid URI: https://example..com');
            assertError(() => id.isUri('https://example.com..'), 'Invalid URI: https://example.com..');
        });

        // Apply RFC 1034 DNS size limits to the non-root dotted presentation.
        test('DNS root dot does not consume the complete-name length limit', () => {
            const validHost = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
            const invalidHost = validHost + 'd';
            assert.equal(validHost.length, 253);
            assert.equal(id.isUri(`https://${validHost}.`), true);
            assertError(() => id.isUri(`https://${invalidHost}.`), `Invalid URI: https://${invalidHost}.`);
        });

        test('Invalid - unicode character', () => {
            assertError(() => id.isUri('https://exämple'), 'Invalid URI: https://exämple');
        });

        test('Invalid - % character (pct_encoded) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa%20mple'), 'Invalid URI: https://exa%20mple');
        });

        test('Invalid - % character (pct_encoded) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa%20mple'), 'Invalid URI: wss://exa%20mple');
        });

        test('Invalid - % character (pct_encoded) in file reg_name', () => {
            assertError(() => id.isUri('file://exa%20mple'), 'Invalid URI: file://exa%20mple');
        });

        test('Invalid - ~ character (unreserved) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa~mple'), 'Invalid URI: https://exa~mple');
        });

        test('Invalid - ~ character (unreserved) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa~mple'), 'Invalid URI: wss://exa~mple');
        });

        test('Invalid - ~ character (unreserved) in file reg_name', () => {
            assertError(() => id.isUri('file://exa~mple'), 'Invalid URI: file://exa~mple');
        });

        test('Invalid - _ character (unreserved) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa_mple'), 'Invalid URI: https://exa_mple');
        });

        test('Invalid - _ character (unreserved) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa_mple'), 'Invalid URI: wss://exa_mple');
        });

        test('Invalid - _ character (unreserved) in file reg_name', () => {
            assertError(() => id.isUri('file://exa_mple'), 'Invalid URI: file://exa_mple');
        });

        test('Invalid - ! character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa!mple'), 'Invalid URI: https://exa!mple');
        });

        test('Invalid - ! character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa!mple'), 'Invalid URI: wss://exa!mple');
        });

        test('Invalid - ! character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa!mple'), 'Invalid URI: file://exa!mple');
        });

        test('Invalid - & character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa&mple'), 'Invalid URI: https://exa&mple');
        });

        test('Invalid - & character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa&mple'), 'Invalid URI: wss://exa&mple');
        });

        test('Invalid - & character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa&mple'), 'Invalid URI: file://exa&mple');
        });

        test('Invalid - $ character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa$mple'), 'Invalid URI: https://exa$mple');
        });

        test('Invalid - $ character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa$mple'), 'Invalid URI: wss://exa$mple');
        });

        test('Invalid - $ character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa$mple'), 'Invalid URI: file://exa$mple');
        });

        test("Invalid - ' character (sub-delims) in http(s) reg_name", () => {
            assertError(() => id.isUri("https://exa'mple"), "Invalid URI: https://exa'mple");
        });

        test("Invalid - ' character (sub-delims) in ws(s) reg_name", () => {
            assertError(() => id.isUri("wss://exa'mple"), "Invalid URI: wss://exa'mple");
        });

        test("Invalid - ' character (sub-delims) in file reg_name", () => {
            assertError(() => id.isUri("file://exa'mple"), "Invalid URI: file://exa'mple");
        });

        test('Invalid - ( character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa(mple'), 'Invalid URI: https://exa(mple');
        });

        test('Invalid - ( character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa(mple'), 'Invalid URI: wss://exa(mple');
        });

        test('Invalid - ( character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa(mple'), 'Invalid URI: file://exa(mple');
        });

        test('Invalid - ) character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa)mple'), 'Invalid URI: https://exa)mple');
        });

        test('Invalid - ) character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa)mple'), 'Invalid URI: wss://exa)mple');
        });

        test('Invalid - ) character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa)mple'), 'Invalid URI: file://exa)mple');
        });

        test('Invalid - * character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa*mple'), 'Invalid URI: https://exa*mple');
        });

        test('Invalid - * character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa*mple'), 'Invalid URI: wss://exa*mple');
        });

        test('Invalid - * character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa*mple'), 'Invalid URI: file://exa*mple');
        });

        test('Invalid - + character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa+mple'), 'Invalid URI: https://exa+mple');
        });

        test('Invalid - + character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa+mple'), 'Invalid URI: wss://exa+mple');
        });

        test('Invalid - + character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa+mple'), 'Invalid URI: file://exa+mple');
        });

        test('Invalid - , character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa,mple'), 'Invalid URI: https://exa,mple');
        });

        test('Invalid - , character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa,mple'), 'Invalid URI: wss://exa,mple');
        });

        test('Invalid - , character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa,mple'), 'Invalid URI: file://exa,mple');
        });

        test('Invalid - ; character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa;mple'), 'Invalid URI: https://exa;mple');
        });

        test('Invalid - ; character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa;mple'), 'Invalid URI: wss://exa;mple');
        });

        test('Invalid - ; character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa;mple'), 'Invalid URI: file://exa;mple');
        });

        test('Invalid - = character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isUri('https://exa=mple'), 'Invalid URI: https://exa=mple');
        });

        test('Invalid - = character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isUri('wss://exa=mple'), 'Invalid URI: wss://exa=mple');
        });

        test('Invalid - = character (sub-delims) in file reg_name', () => {
            assertError(() => id.isUri('file://exa=mple'), 'Invalid URI: file://exa=mple');
        });

        test('Valid case insensitive http scheme', () => {
            assert.equal(id.isUri('httP://example'), true);
        });

        test('Valid case insensitive https scheme', () => {
            assert.equal(id.isUri('httPs://example'), true);
        });

        test('Valid case insensitive ws scheme', () => {
            assert.equal(id.isUri('WS://example'), true);
        });

        test('Valid case insensitive wss scheme', () => {
            assert.equal(id.isUri('WSs://example'), true);
        });

        // Accept RFC 8089's empty file authority while preserving its absolute path.
        test('Valid empty file host with an absolute URI path', () => {
            const parsed = id.parseUri('fILE:///path/to/file');
            assert.equal(id.isUri('file:///'), true);
            assert.equal(parsed.authority, '');
            assert.equal(parsed.host, '');
            assert.equal(parsed.path, '/path/to/file');
        });

        // Keep the empty-host exception isolated from network-oriented scheme policies.
        test('Invalid empty URI host for network schemes', () => {
            // Exercise each scheme that continues to require a non-empty host.
            for (const scheme of ['http', 'https', 'ws', 'wss']) {
                assertError(() => id.isUri(`${scheme}:///path`), `Invalid URI: ${scheme}:///path`);
            }
        });

        test('Valid case insensitive file scheme', () => {
            assert.equal(id.isUri('fILE://example'), true);
        });

    });

    describe('isIri with hostnames', () => {
        test('Valid character ! (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa!mple'), true);
        });

        test('Valid character & (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa&mple'), true);
        });

        test('Valid character $ (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa$mple'), true);
        });

        test("Valid character ' (sub-delims) in iri reg_name", () => {
            assert.equal(id.isIri("iri://exa'mple"), true);
        });

        test('Valid character ( (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa(mple'), true);
        });

        test('Valid character ) (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa)mple'), true);
        });

        test('Valid character * (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa*mple'), true);
        });

        test('Valid character + (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa+mple'), true);
        });

        test('Valid character , (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa,mple'), true);
        });

        test('Valid character ; (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa;mple'), true);
        });

        test('Valid character = (sub-delims) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa=mple'), true);
        });

        test('Valid character - (unreserved) anywhere in iri reg_name', () => {
            assert.equal(id.isIri('iri://-exa-mple-'), true);
        });

        test('Valid character . multiple times (unreserved) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa..mple'), true);
        });

        test('Valid character _ (unreserved) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa_mple'), true);
        });

        test('Valid character %20 (pct-encoded) in iri reg_name', () => {
            assert.equal(id.isIri('iri://exa%20mple'), true);
        });

        test('Invalid %GG (invalid pct-encoded) in iri reg_name', () => {
            assertError(() => id.isIri('iri://exa%GGmple'), 'Invalid IRI: iri://exa%GGmple');
        });

        test('Valid label - alphanumeric', () => {
            assert.equal(id.isIri('https://example'), true);
        });

        test('Valid label - hyphen in middle', () => {
            assert.equal(id.isIri('https://exa-mple'), true);
        });

        test('Invalid label - hyphen at start', () => {
            assertError(() => id.isIri('https://-example'), 'Invalid IRI: https://-example');
        });

        test('Invalid label - hyphen at end', () => {
            assertError(() => id.isIri('https://example-'), 'Invalid IRI: https://example-');
        });

        test('Valid unicode label - Latin extended', () => {
            assert.equal(id.isIri('https://exämple'), true);
        });

        test('Valid unicode label - Chinese', () => {
            assert.equal(id.isIri('https://例子'), true);
        });

        test('Valid unicode label - Hindi', () => {
            assert.equal(id.isIri('https://उदाहरण'), true);
        });

        test('Valid unicode label - Japanese', () => {
            assert.equal(id.isIri('https://例え.テスト'), true);
        });

        test('Valid label with middle dot', () => {
            assert.equal(id.isIri('https://exa·mple'), true);
        });

        test('Invalid - leading dot', () => {
            assertError(() => id.isIri('https://.example'), 'Invalid IRI: https://.example');
        });

        // Accept every UTS #46 label separator as one terminal DNS root marker in an IRI.
        test('Valid - terminal DNS root separator', () => {
            // Preserve each parsed separator while exercising every DNS-host IRI scheme.
            for (const separator of ['.', '\uFF0E', '\u3002', '\uFF61']) {
                for (const scheme of ['http', 'https', 'ws', 'wss', 'file']) {
                    const absoluteInput = `${scheme}://例子${separator}:8443/path?query`;
                    const input = absoluteInput + '#fragment';
                    const parsed = id.parseIri(input);
                    assert.equal(id.isIri(input), true);
                    assert.equal(id.isIriReference(input), true);
                    assert.equal(id.isAbsoluteIri(absoluteInput), true);
                    assert.equal(parsed.host, `例子${separator}`);
                    assert.equal(id.parseIriReference(input).host, `例子${separator}`);
                    assert.equal(id.parseAbsoluteIri(absoluteInput).host, `例子${separator}`);
                }
            }
        });

        // Reject empty non-root label positions for every accepted IRI separator spelling.
        test('Invalid - root-only or consecutive separators', () => {
            // Reject every root-marker spelling when it is not preceded by a non-root label.
            for (const separator of ['.', '\uFF0E', '\u3002', '\uFF61']) {
                assertError(() => id.isIri(`https://${separator}`), `Invalid IRI: https://${separator}`);
            }
            assertError(() => id.isIri('https://example..test'), 'Invalid IRI: https://example..test');
            assertError(() => id.isIri('https://example.。'), 'Invalid IRI: https://example.。');
        });

        // Keep the optional root marker outside the DNS presentation-length boundary.
        test('DNS root separator does not consume the complete-name length limit', () => {
            const validHost = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
            const invalidHost = validHost + 'd';
            assert.equal(id.isIri(`https://${validHost}。`), true);
            assertError(() => id.isIri(`https://${invalidHost}。`), `Invalid IRI: https://${invalidHost}。`);
        });

        test('Invalid - emoji in label', () => {
            assertError(() => id.isIri('https://example😀'), 'Invalid IRI: https://example😀');
        });

        test('Invalid - % character (pct_encoded) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa%20mple'), 'Invalid IRI: https://exa%20mple');
        });

        test('Invalid - % character (pct_encoded) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa%20mple'), 'Invalid IRI: wss://exa%20mple');
        });

        test('Invalid - % character (pct_encoded) in file reg_name', () => {
            assertError(() => id.isIri('file://exa%20mple'), 'Invalid IRI: file://exa%20mple');
        });

        test('Invalid - ~ character (unreserved) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa~mple'), 'Invalid IRI: https://exa~mple');
        });

        test('Invalid - ~ character (unreserved) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa~mple'), 'Invalid IRI: wss://exa~mple');
        });

        test('Invalid - ~ character (unreserved) in file reg_name', () => {
            assertError(() => id.isIri('file://exa~mple'), 'Invalid IRI: file://exa~mple');
        });

        test('Invalid - _ character (unreserved) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa_mple'), 'Invalid IRI: https://exa_mple');
        });

        test('Invalid - _ character (unreserved) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa_mple'), 'Invalid IRI: wss://exa_mple');
        });

        test('Invalid - _ character (unreserved) in file reg_name', () => {
            assertError(() => id.isIri('file://exa_mple'), 'Invalid IRI: file://exa_mple');
        });

        test('Invalid - ! character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa!mple'), 'Invalid IRI: https://exa!mple');
        });

        test('Invalid - ! character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa!mple'), 'Invalid IRI: wss://exa!mple');
        });

        test('Invalid - ! character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa!mple'), 'Invalid IRI: file://exa!mple');
        });

        test('Invalid - & character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa&mple'), 'Invalid IRI: https://exa&mple');
        });

        test('Invalid - & character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa&mple'), 'Invalid IRI: wss://exa&mple');
        });

        test('Invalid - & character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa&mple'), 'Invalid IRI: file://exa&mple');
        });

        test('Invalid - $ character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa$mple'), 'Invalid IRI: https://exa$mple');
        });

        test('Invalid - $ character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa$mple'), 'Invalid IRI: wss://exa$mple');
        });

        test('Invalid - $ character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa$mple'), 'Invalid IRI: file://exa$mple');
        });

        test("Invalid - ' character (sub-delims) in http(s) reg_name", () => {
            assertError(() => id.isIri("https://exa'mple"), "Invalid IRI: https://exa'mple");
        });

        test("Invalid - ' character (sub-delims) in ws(s) reg_name", () => {
            assertError(() => id.isIri("wss://exa'mple"), "Invalid IRI: wss://exa'mple");
        });

        test("Invalid - ' character (sub-delims) in file reg_name", () => {
            assertError(() => id.isIri("file://exa'mple"), "Invalid IRI: file://exa'mple");
        });

        test('Invalid - ( character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa(mple'), 'Invalid IRI: https://exa(mple');
        });

        test('Invalid - ( character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa(mple'), 'Invalid IRI: wss://exa(mple');
        });

        test('Invalid - ( character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa(mple'), 'Invalid IRI: file://exa(mple');
        });

        test('Invalid - ) character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa)mple'), 'Invalid IRI: https://exa)mple');
        });

        test('Invalid - ) character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa)mple'), 'Invalid IRI: wss://exa)mple');
        });

        test('Invalid - ) character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa)mple'), 'Invalid IRI: file://exa)mple');
        });

        test('Invalid - * character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa*mple'), 'Invalid IRI: https://exa*mple');
        });

        test('Invalid - * character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa*mple'), 'Invalid IRI: wss://exa*mple');
        });

        test('Invalid - * character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa*mple'), 'Invalid IRI: file://exa*mple');
        });

        test('Invalid - + character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa+mple'), 'Invalid IRI: https://exa+mple');
        });

        test('Invalid - + character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa+mple'), 'Invalid IRI: wss://exa+mple');
        });

        test('Invalid - + character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa+mple'), 'Invalid IRI: file://exa+mple');
        });

        test('Invalid - , character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa,mple'), 'Invalid IRI: https://exa,mple');
        });

        test('Invalid - , character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa,mple'), 'Invalid IRI: wss://exa,mple');
        });

        test('Invalid - , character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa,mple'), 'Invalid IRI: file://exa,mple');
        });

        test('Invalid - ; character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa;mple'), 'Invalid IRI: https://exa;mple');
        });

        test('Invalid - ; character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa;mple'), 'Invalid IRI: wss://exa;mple');
        });

        test('Invalid - ; character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa;mple'), 'Invalid IRI: file://exa;mple');
        });

        test('Invalid - = character (sub-delims) in http(s) reg_name', () => {
            assertError(() => id.isIri('https://exa=mple'), 'Invalid IRI: https://exa=mple');
        });

        test('Invalid - = character (sub-delims) in ws(s) reg_name', () => {
            assertError(() => id.isIri('wss://exa=mple'), 'Invalid IRI: wss://exa=mple');
        });

        test('Invalid - = character (sub-delims) in file reg_name', () => {
            assertError(() => id.isIri('file://exa=mple'), 'Invalid IRI: file://exa=mple');
        });

        test('Valid case insensitive http scheme', () => {
            assert.equal(id.isIri('httP://example'), true);
        });

        test('Valid case insensitive https scheme', () => {
            assert.equal(id.isIri('httPs://example'), true);
        });

        test('Valid case insensitive ws scheme', () => {
            assert.equal(id.isIri('WS://example'), true);
        });

        test('Valid case insensitive wss scheme', () => {
            assert.equal(id.isIri('WSs://example'), true);
        });

        // Accept RFC 8089's empty file authority with an internationalized absolute path.
        test('Valid empty file host with an absolute IRI path', () => {
            const parsed = id.parseIri('fILE:///路径');
            assert.equal(id.isIri('file:///'), true);
            assert.equal(parsed.authority, '');
            assert.equal(parsed.host, '');
            assert.equal(parsed.path, '/路径');
        });

        // Keep the empty-host exception isolated from network-oriented scheme policies.
        test('Invalid empty IRI host for network schemes', () => {
            // Exercise each scheme that continues to require a non-empty host.
            for (const scheme of ['http', 'https', 'ws', 'wss']) {
                assertError(() => id.isIri(`${scheme}:///path`), `Invalid IRI: ${scheme}:///path`);
            }
        });

        test('Valid case insensitive file scheme', () => {
            assert.equal(id.isIri('fILE://example'), true);
        });

    });

    // Verify the RFC 8141 restrictions applied when generic URI/IRI syntax uses the urn scheme.
    describe('URN scheme grammar', () => {
        // Accept representative namestring forms through complete URI and IRI operations.
        test('accepts complete namestring forms', () => {
            const values = [
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
            // Exercise both URI and IRI representations and their reference forms.
            for (const callback of ['isUri', 'isUriReference', 'isIri', 'isIriReference']) {
                for (const value of values) assert.equal(id[callback](value), true);
            }
        });

        // Keep fragment-free URNs within absolute URI and IRI grammar.
        test('accepts fragment-free absolute namestrings', () => {
            for (const callback of ['isAbsoluteUri', 'isAbsoluteIri']) {
                assert.equal(id[callback]('URN:EXAMPLE:a/b?+abc?=xyz'), true);
                assertError(() => id[callback]('urn:example:a#fragment'), `Invalid ${callback === 'isAbsoluteUri' ? 'absolute-URI' : 'absolute-IRI'}`);
            }
        });

        // Reject generic URI shapes that violate the implemented URN scheme grammar.
        test('rejects malformed URN scheme syntax', () => {
            const values = [
                'urn:a:nss',
                `urn:a${'b'.repeat(31)}z:nss`,
                'urn:-ab:nss',
                'urn:ab-:nss',
                'urn::nss',
                'urn:example:',
                'urn:example:/nss',
                'urn:example:a?',
                'urn:example:a?ordinary',
                'urn:example:a?+',
                'urn:example:a?+?x',
                'urn:example:a?+/x',
                'urn:example:a?=',
                'urn:example:a?=/x',
                'urn:example:a?+r?=',
                'urn://example/a',
                'urn:example:a?query',
            ];
            // Require scheme validation through both generic reference operations.
            for (const callback of ['isUriReference', 'isIriReference']) {
                for (const value of values) assert.throws(() => id[callback](value), SyntaxError);
            }
        });

        // Enforce ASCII and valid percent triplets throughout URN syntax.
        test('rejects invalid characters and percent encoding', () => {
            const values = ['urn:example:a[', 'urn:example:a%2', 'urn:example:a%GG', 'urn:example:café', 'urn:example:a?+résolution', 'urn:example:a?=quête', 'urn:example:a#résultat'];
            // Apply the same character restrictions through URI and IRI operations.
            for (const callback of ['isUri', 'isIri']) {
                for (const value of values) assert.throws(() => id[callback](value), SyntaxError);
            }
        });
    });

};
