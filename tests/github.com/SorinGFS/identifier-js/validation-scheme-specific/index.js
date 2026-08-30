'use strict';
// Verify scheme-specific hostname validation policies.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id) => {
    // Match Vitest's Error-subclass and message-content checks.
    const assertError = (operation, message) => assert.throws(
        operation,
        (error) => error instanceof Error && error.message.includes(message),
    );


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

        test('Invalid - trailing dot', () => {
            assertError(() => id.isUri('https://example.com.'), 'Invalid URI: https://example.com.');
        });

        test('Invalid - consecutive dots', () => {
            assertError(() => id.isUri('https://example..com'), 'Invalid URI: https://example..com');
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

        test('Invalid - trailing dot', () => {
            assertError(() => id.isIri('https://example.'), 'Invalid IRI: https://example.');
        });

        test('Invalid - consecutive dots', () => {
            assertError(() => id.isIri('https://example..test'), 'Invalid IRI: https://example..test');
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

        test('Valid case insensitive file scheme', () => {
            assert.equal(id.isIri('fILE://example'), true);
        });

    });

};
