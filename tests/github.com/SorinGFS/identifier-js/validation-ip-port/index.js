'use strict';
// Verify IP address and port validation boundaries.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id) => {
    // Match Vitest's Error-subclass and message-content checks.
    const assertError = (operation, message) => assert.throws(
        operation,
        (error) => error instanceof Error && error.message.includes(message),
    );


    describe('isUri – IPv4 host validation', () => {
        test('Valid full IPv4 address', () => {
            assert.equal(id.isUri('https://1.2.3.4'), true);
        });

        test('Invalid IPv4 address, but valid as hostname', () => {
            assert.equal(id.isUri('https://999.999.999.999'), true);
        });
    });

    describe('isIri – IPv4 host validation', () => {
        test('Valid full IPv4 address', () => {
            assert.equal(id.isIri('https://1.2.3.4'), true);
        });

        test('Invalid IPv4 address, but valid as hostname', () => {
            assert.equal(id.isIri('https://999.999.999.999'), true);
        });
    });

    // Verify both ABNF-permitted cases of the IPvFuture version marker.
    describe('URI and IRI IPvFuture host validation', () => {
        // Retain coverage for the conventional lowercase marker.
        test('URI accepts a lowercase IPvFuture version marker', () => {
            assert.equal(id.isUri('scheme://[v1.a]'), true);
        });

        // Enforce ABNF literal case-insensitivity for URI hosts.
        test('URI accepts an uppercase IPvFuture version marker', () => {
            assert.equal(id.isUri('scheme://[V1.a]'), true);
        });

        // Retain equivalent lowercase-marker coverage through IRI grammar.
        test('IRI accepts a lowercase IPvFuture version marker', () => {
            assert.equal(id.isIri('scheme://[v1.a]'), true);
        });

        // Enforce ABNF literal case-insensitivity for IRI hosts.
        test('IRI accepts an uppercase IPvFuture version marker', () => {
            assert.equal(id.isIri('scheme://[V1.a]'), true);
        });
    });

    describe('isUri – IPv6 host validation', () => {
        test('Valid full (uncompressed) IPv6 address', () => {
            assert.equal(id.isUri('https://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]'), true);
        });

        test('Valid full IPv6 address (no zero compression)', () => {
            assert.equal(id.isUri('https://[2001:db8:85a3:0:0:8a2e:370:7334]'), true);
        });

        test('Valid IPv6 address with zero compression (::)', () => {
            assert.equal(id.isUri('https://[2001:db8:85a3::8a2e:370:7334]'), true);
        });

        test('Valid loopback IPv6 address (::1)', () => {
            assert.equal(id.isUri('https://[::1]'), true);
        });

        test('Valid unspecified IPv6 address (::)', () => {
            assert.equal(id.isUri('https://[::]'), true);
        });

        test('Valid compressed IPv6 address (trailing compression)', () => {
            assert.equal(id.isUri('https://[2001:db8::]'), true);
        });

        test('Valid IPv6 with embedded IPv4 (IPv4-mapped)', () => {
            assert.equal(id.isUri('https://[::ffff:192.168.1.1]'), true);
        });

        test('Valid IPv6 with embedded IPv4 (mixed notation)', () => {
            assert.equal(id.isUri('https://[2001:db8::192.168.1.1]'), true);
        });

        test('Valid link-local IPv6 address', () => {
            assert.equal(id.isUri('https://[fe80::1]'), true);
        });

        test('Valid maximum-length IPv6 address', () => {
            assert.equal(id.isUri('https://[ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff]'), true);
        });

        test('Invalid IPv6 – excessive colon sequence', () => {
            assertError(() => id.isUri('https://[2001:db8:85a3:::8a2e:370:7334]'), 'Invalid URI: https://[2001:db8:85a3:::8a2e:370:7334]');
        });

        test('Invalid IPv6 – multiple zero compressions (::)', () => {
            assertError(() => id.isUri('https://[2001:db8:85a3::8a2e::7334]'), 'Invalid URI: https://[2001:db8:85a3::8a2e::7334]');
        });

        test('Invalid IPv6 – segment exceeds 16-bit limit', () => {
            assertError(() => id.isUri('https://[12345::]'), 'Invalid URI: https://[12345::]');
        });

        test('Invalid IPv6 – insufficient segments without compression', () => {
            assertError(() => id.isUri('https://[2001:db8:85a3:8a2e:370:7334]'), 'Invalid URI: https://[2001:db8:85a3:8a2e:370:7334]');
        });

        test('Invalid IPv6 – too many segments', () => {
            assertError(() => id.isUri('https://[2001:db8:85a3:0000:0000:8a2e:0370:7334:1234]'), 'Invalid URI: https://[2001:db8:85a3:0000:0000:8a2e:0370:7334:1234]');
        });

        test('Invalid IPv6 – embedded IPv4 out of range', () => {
            assertError(() => id.isUri('https://[::ffff:999.168.1.1]'), 'Invalid URI: https://[::ffff:999.168.1.1]');
        });

        test('Invalid IPv6 – non-hexadecimal character in segment', () => {
            assertError(() => id.isUri('https://[2001:db8::g1]'), 'Invalid URI: https://[2001:db8::g1]');
        });

        test('Invalid IPv6 – leading colon without compression', () => {
            assertError(() => id.isUri('https://[:2001:db8::1]'), 'Invalid URI: https://[:2001:db8::1]');
        });

        test('Invalid IPv6 – trailing colon without compression', () => {
            assertError(() => id.isUri('https://[2001:db8::1:]'), 'Invalid URI: https://[2001:db8::1:]');
        });

        test('Invalid IPv6 – empty address literal', () => {
            assertError(() => id.isUri('https://[]'), 'Invalid URI: https://[]');
        });

        test('Invalid IPv6 – address literal with missing opening bracket', () => {
            assertError(() => id.isUri('https://::1]'), 'Invalid URI: https://::1]');
        });

        test('Invalid IPv6 – address literal with missing closing bracket', () => {
            assertError(() => id.isUri('https://[::1'), 'Invalid URI: https://[::1');
        });
    });

    describe('isIri – IPv6 host validation', () => {
        test('Valid full (uncompressed) IPv6 address', () => {
            assert.equal(id.isIri('https://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]'), true);
        });

        test('Valid full IPv6 address (no zero compression)', () => {
            assert.equal(id.isIri('https://[2001:db8:85a3:0:0:8a2e:370:7334]'), true);
        });

        test('Valid IPv6 address with zero compression (::)', () => {
            assert.equal(id.isIri('https://[2001:db8:85a3::8a2e:370:7334]'), true);
        });

        test('Valid loopback IPv6 address (::1)', () => {
            assert.equal(id.isIri('https://[::1]'), true);
        });

        test('Valid unspecified IPv6 address (::)', () => {
            assert.equal(id.isIri('https://[::]'), true);
        });

        test('Valid compressed IPv6 address (trailing compression)', () => {
            assert.equal(id.isIri('https://[2001:db8::]'), true);
        });

        test('Valid IPv6 with embedded IPv4 (IPv4-mapped)', () => {
            assert.equal(id.isIri('https://[::ffff:192.168.1.1]'), true);
        });

        test('Valid IPv6 with embedded IPv4 (mixed notation)', () => {
            assert.equal(id.isIri('https://[2001:db8::192.168.1.1]'), true);
        });

        test('Valid link-local IPv6 address', () => {
            assert.equal(id.isIri('https://[fe80::1]'), true);
        });

        test('Valid maximum-length IPv6 address', () => {
            assert.equal(id.isIri('https://[ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff]'), true);
        });

        test('Invalid IPv6 – excessive colon sequence', () => {
            assertError(() => id.isIri('https://[2001:db8:85a3:::8a2e:370:7334]'), 'Invalid IRI: https://[2001:db8:85a3:::8a2e:370:7334]');
        });

        test('Invalid IPv6 – multiple zero compressions (::)', () => {
            assertError(() => id.isIri('https://[2001:db8:85a3::8a2e::7334]'), 'Invalid IRI: https://[2001:db8:85a3::8a2e::7334]');
        });

        test('Invalid IPv6 – segment exceeds 16-bit limit', () => {
            assertError(() => id.isIri('https://[12345::]'), 'Invalid IRI: https://[12345::]');
        });

        test('Invalid IPv6 – insufficient segments without compression', () => {
            assertError(() => id.isIri('https://[2001:db8:85a3:8a2e:370:7334]'), 'Invalid IRI: https://[2001:db8:85a3:8a2e:370:7334]');
        });

        test('Invalid IPv6 – too many segments', () => {
            assertError(() => id.isIri('https://[2001:db8:85a3:0000:0000:8a2e:0370:7334:1234]'), 'Invalid IRI: https://[2001:db8:85a3:0000:0000:8a2e:0370:7334:1234]');
        });

        test('Invalid IPv6 – embedded IPv4 out of range', () => {
            assertError(() => id.isIri('https://[::ffff:999.168.1.1]'), 'Invalid IRI: https://[::ffff:999.168.1.1]');
        });

        test('Invalid IPv6 – non-hexadecimal character in segment', () => {
            assertError(() => id.isIri('https://[2001:db8::g1]'), 'Invalid IRI: https://[2001:db8::g1]');
        });

        test('Invalid IPv6 – leading colon without compression', () => {
            assertError(() => id.isIri('https://[:2001:db8::1]'), 'Invalid IRI: https://[:2001:db8::1]');
        });

        test('Invalid IPv6 – trailing colon without compression', () => {
            assertError(() => id.isIri('https://[2001:db8::1:]'), 'Invalid IRI: https://[2001:db8::1:]');
        });

        test('Invalid IPv6 – empty address literal', () => {
            assertError(() => id.isIri('https://[]'), 'Invalid IRI: https://[]');
        });

        test('Invalid IPv6 – address literal with missing opening bracket', () => {
            assertError(() => id.isIri('https://::1]'), 'Invalid IRI: https://::1]');
        });

        test('Invalid IPv6 – address literal with missing closing bracket', () => {
            assertError(() => id.isIri('https://[::1'), 'Invalid IRI: https://[::1');
        });
    });

    describe('isUri – port validation', () => {
        test('Valid port', () => {
            assert.equal(id.isUri('https://example.com:80'), true);
        });

        test('Valid port zero', () => {
            assert.equal(id.isUri('https://example.com:0'), true);
        });

        // Keep lexical leading zeroes independent of transport interpretation.
        test('Valid port with leading zeroes', () => {
            assert.equal(id.isUri('https://example.com:00080'), true);
        });

        // Keep generic syntax independent of transport-specific numeric ranges.
        test('Valid port beyond a transport-specific numeric range', () => {
            assert.equal(id.isUri('https://example.com:65536'), true);
        });

        // Verify that the RFC repetition has no grammar-level upper length bound.
        test('Valid arbitrarily long port syntax', () => {
            assert.equal(id.isUri('https://example.com:12345678901234567890'), true);
        });

        test('Valid port empty', () => {
            assert.equal(id.isUri('https://example.com:/'), true);
        });

        test('Invalid "space" port', () => {
            assertError(() => id.isUri('https://example.com: /'), 'Invalid URI: https://example.com: /');
        });

        test('Invalid "space" before port', () => {
            assertError(() => id.isUri('https://example.com: 80/'), 'Invalid URI: https://example.com: 80/');
        });

        test('Invalid "space" after port', () => {
            assertError(() => id.isUri('https://example.com:80 /'), 'Invalid URI: https://example.com:80 /');
        });

        test('Invalid port char', () => {
            assertError(() => id.isUri('https://example.com:ff'), 'Invalid URI: https://example.com:ff');
        });

        // Preserve the grammar boundary at decimal digits rather than numeric range.
        test('Invalid port with a nondigit', () => {
            assertError(() => id.isUri('https://example.com:6553a'), 'Invalid URI: https://example.com:6553a');
        });
    });

    describe('isIri – port validation', () => {
        test('Valid port', () => {
            assert.equal(id.isIri('https://example.com:80'), true);
        });

        test('Valid port zero', () => {
            assert.equal(id.isIri('https://example.com:0'), true);
        });

        // Keep lexical leading zeroes independent of transport interpretation.
        test('Valid port with leading zeroes', () => {
            assert.equal(id.isIri('https://example.com:00080'), true);
        });

        // Keep generic syntax independent of transport-specific numeric ranges.
        test('Valid port beyond a transport-specific numeric range', () => {
            assert.equal(id.isIri('https://example.com:65536'), true);
        });

        // Verify that the RFC repetition has no grammar-level upper length bound.
        test('Valid arbitrarily long port syntax', () => {
            assert.equal(id.isIri('https://example.com:12345678901234567890'), true);
        });

        test('Valid port empty', () => {
            assert.equal(id.isIri('https://example.com:/'), true);
        });

        test('Invalid "space" port', () => {
            assertError(() => id.isIri('https://example.com: /'), 'Invalid IRI: https://example.com: /');
        });

        test('Invalid "space" before port', () => {
            assertError(() => id.isIri('https://example.com: 80/'), 'Invalid IRI: https://example.com: 80/');
        });

        test('Invalid "space" after port', () => {
            assertError(() => id.isIri('https://example.com:80 /'), 'Invalid IRI: https://example.com:80 /');
        });

        test('Invalid port char', () => {
            assertError(() => id.isIri('https://example.com:ff'), 'Invalid IRI: https://example.com:ff');
        });

        // Preserve the grammar boundary at decimal digits rather than numeric range.
        test('Invalid port with a nondigit', () => {
            assertError(() => id.isIri('https://example.com:6553a'), 'Invalid IRI: https://example.com:6553a');
        });
    });

};
