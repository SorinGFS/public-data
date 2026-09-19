'use strict';
// Verify the replacement API and RFC 5321/RFC 6531 Mailbox conformance.
const assert = require('node:assert/strict');
const { test } = require('node:test');

// Register shared API, grammar, length, IDNA-boundary, and address-literal scenarios.
module.exports = (subject) => {
    const { isIdnEmailAddress, idnEmailAddress } = subject;

    // Evaluate one local part against a minimal valid single-label domain.
    const acceptsLocalPart = (localPart) => {
        try { return isIdnEmailAddress(`${localPart}@a`) === true; } catch { return false; }
    };

    // Require the replacement exports without retaining aliases for the former API.
    test('exports only the replacement email-address operations', () => {
        assert.deepEqual(Object.keys(subject).sort(), ['idnEmailAddress', 'isIdnEmailAddress']);
        assert.equal(subject.idnEmail, undefined);
        assert.equal(subject.isIdnEmail, undefined);
    });

    // Verify every ASCII code point against the RFC 5321/RFC 5322 atext import.
    test('matches the complete ASCII atext repertoire', () => {
        const specials = "!#$%&'*+-/=?^_" + String.fromCodePoint(0x60) + '{|}~';
        // Exercise every ASCII scalar independently so delimiters and controls remain excluded.
        for (let codePoint = 0; codePoint < 0x80; codePoint++) {
            const character = String.fromCodePoint(codePoint);
            const expected = /^[A-Za-z0-9]$/.test(character) || specials.includes(character);
            assert.equal(acceptsLocalPart(character), expected, `atext U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
        }
    });

    // Verify every ASCII code point against the qtextSMTP ranges.
    test('matches the complete ASCII qtextSMTP repertoire', () => {
        // Quote each scalar without escaping it and compare with the three RFC 5321 ranges.
        for (let codePoint = 0; codePoint < 0x80; codePoint++) {
            const localPart = String.fromCodePoint(0x22, codePoint, 0x22);
            const expected = codePoint === 0x20 || codePoint === 0x21 || (codePoint >= 0x23 && codePoint <= 0x5B) || (codePoint >= 0x5D && codePoint <= 0x7E);
            assert.equal(acceptsLocalPart(localPart), expected, `qtextSMTP U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
        }
    });

    // Verify every ASCII code point against quoted-pairSMTP after the backslash.
    test('matches the complete quoted-pairSMTP repertoire', () => {
        // Escape each scalar and require exactly ASCII space through tilde.
        for (let codePoint = 0; codePoint < 0x80; codePoint++) {
            const localPart = String.fromCodePoint(0x22, 0x5C, codePoint, 0x22);
            assert.equal(acceptsLocalPart(localPart), codePoint >= 0x20 && codePoint <= 0x7E, `quoted-pairSMTP U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
        }
    });

    // Cover the boundaries of every valid RFC 3629 non-ASCII scalar range.
    test('accepts UTF8-non-ascii scalar boundaries in atext and qtextSMTP', () => {
        const boundaries = [0x80, 0x7FF, 0x800, 0xD7FF, 0xE000, 0xFFFF, 0x10000, 0x10FFFF];
        // Check each scalar both as a dot-string atom and as unescaped quoted content.
        for (const codePoint of boundaries) {
            const character = String.fromCodePoint(codePoint);
            assert.equal(acceptsLocalPart(character), true, `UTF8 atext U+${codePoint.toString(16).toUpperCase()}`);
            assert.equal(acceptsLocalPart(`"${character}"`), true, `UTF8 qtextSMTP U+${codePoint.toString(16).toUpperCase()}`);
        }
    });

    // Preserve local-part identity while admitting the complete RFC 6531 non-ASCII extension.
    test('preserves unnormalized and supplementary local-part scalars', () => {
        const decomposed = 'e\u0301@mañana.example';
        assert.equal(isIdnEmailAddress(decomposed), true);
        assert.equal(idnEmailAddress(decomposed), 'e\u0301@xn--maana-pta.example');
        assert.throws(() => isIdnEmailAddress(`${'e\u0301'.repeat(22)}@example.com`), /larger than 64 octets/);
        assert.equal(isIdnEmailAddress('😀@example.com'), true);
        assert.equal(idnEmailAddress('😀@example.com'), '😀@example.com');
    });

    // Enforce qtextSMTP and quoted-pairSMTP independently of the non-ASCII extension.
    test('implements SMTP quoted-string structure', () => {
        assert.equal(isIdnEmailAddress(String.raw`"foo\bar"@example.com`), true);
        assert.equal(isIdnEmailAddress('"😀"@example.com'), true);
        assert.throws(() => isIdnEmailAddress('"a\tb"@example.com'), SyntaxError);
        assert.throws(() => isIdnEmailAddress('"a\\😀"@example.com'), SyntaxError);
        assert.throws(() => isIdnEmailAddress('""@example.com'), SyntaxError);
    });

    // Admit only Unicode domain labels that are already NFC and unchanged by UTS #46 mapping.
    test('requires strict U-label source spelling and delegated context checks', () => {
        assert.equal(isIdnEmailAddress('user@faß.de'), true);
        assert.equal(idnEmailAddress('user@faß.de'), 'user@xn--fa-hia.de');
        assert.equal(isIdnEmailAddress('user@مثال.إختبار'), true);
        assert.equal(isIdnEmailAddress('user@l·l.example'), true);
        assert.throws(() => isIdnEmailAddress('user@a·l.example'), SyntaxError);
        assert.throws(() => isIdnEmailAddress('user@É.example'), /must not require UTS #46 mapping/);
        assert.throws(() => isIdnEmailAddress('user@e\u0301.example'), /must be in NFC/);
        assert.throws(() => isIdnEmailAddress('user@ｅxample.com'), /must not require UTS #46 mapping/);
        assert.throws(() => isIdnEmailAddress('user@a\u180Eb.example'), /must not require UTS #46 mapping/);
        assert.throws(() => isIdnEmailAddress('user@example\u3002com'), /must not require UTS #46 mapping/);
        assert.throws(() => isIdnEmailAddress('user@example.com.'), /trailing dot/);
    });

    // Exercise valid, canonicalized, and asymmetric A-label inputs through the dependency boundary.
    test('validates A-label symmetry and canonical ACE output', () => {
        assert.equal(isIdnEmailAddress('user@xn--maana-pta.example'), true);
        assert.equal(isIdnEmailAddress('user@XN--MAANA-PTA.EXAMPLE'), true);
        assert.equal(idnEmailAddress('user@XN--MAANA-PTA.EXAMPLE'), 'user@xn--maana-pta.example');
        assert.equal(idnEmailAddress('USER@mañana.EXAMPLE'), 'USER@xn--maana-pta.example');
        assert.throws(() => isIdnEmailAddress('user@xn--a.example'), SyntaxError);
        assert.throws(() => isIdnEmailAddress('user@ab--cd.example'), SyntaxError);
    });

    // Accept all RFC 5321 IPv4 and IPv6 alternatives and reject malformed group layouts and tags.
    test('validates and preserves address literals', () => {
        assert.equal(idnEmailAddress('user@[192.0.2.1]'), 'user@[192.0.2.1]');
        assert.equal(idnEmailAddress('user@[001.002.003.004]'), 'user@[001.002.003.004]');
        assert.equal(idnEmailAddress('user@[IPv6:1:2:3:4:5:6:7:8]'), 'user@[IPv6:1:2:3:4:5:6:7:8]');
        assert.equal(idnEmailAddress('user@[IPv6:2001:db8::1]'), 'user@[IPv6:2001:db8::1]');
        assert.equal(idnEmailAddress('user@[IPv6:1:2:3:4:5:6:192.0.2.1]'), 'user@[IPv6:1:2:3:4:5:6:192.0.2.1]');
        assert.equal(idnEmailAddress('user@[IPv6:::ffff:192.0.2.1]'), 'user@[IPv6:::ffff:192.0.2.1]');
        assert.equal(idnEmailAddress('user@[ipv6:::1]'), 'user@[ipv6:::1]');
        assert.throws(() => isIdnEmailAddress('user@[256.0.0.1]'), SyntaxError);
        assert.throws(() => isIdnEmailAddress('user@[IPv6:1:2:3:4:5:6:7]'), SyntaxError);
        assert.throws(() => isIdnEmailAddress('user@[IPv6:1:2:3:4:5:6:7::]'), SyntaxError);
        assert.throws(() => isIdnEmailAddress('user@[IPv6:192.0.2.1::]'), SyntaxError);
        assert.throws(() => isIdnEmailAddress('user@[IPv6:1::2::3]'), SyntaxError);
        assert.throws(() => isIdnEmailAddress('user@[future:value]'), SyntaxError);
    });

    // Reject malformed JavaScript Unicode before UTF-8 measurement can replace lone surrogates.
    test('rejects unpaired UTF-16 surrogates', () => {
        assert.throws(() => isIdnEmailAddress(`a\uD800@example.com`), /well-formed Unicode/);
        assert.throws(() => isIdnEmailAddress(`a@\uDC00.example`), /well-formed Unicode/);
    });

    // Enforce exact source local-part and complete-mailbox octet boundaries.
    test('enforces original SMTP mailbox octet limits', () => {
        const domain252 = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(60)}`;
        const domain253 = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(61)}`;
        assert.equal(isIdnEmailAddress(`${'a'.repeat(64)}@b`), true);
        assert.throws(() => isIdnEmailAddress(`${'a'.repeat(65)}@b`), /larger than 64 octets/);
        assert.equal(isIdnEmailAddress(`${'😀'.repeat(16)}@b`), true);
        assert.throws(() => isIdnEmailAddress(`${'😀'.repeat(17)}@b`), /larger than 64 octets/);
        assert.equal(new TextEncoder().encode(`a@${domain252}`).length, 254);
        assert.equal(isIdnEmailAddress(`a@${domain252}`), true);
        assert.equal(new TextEncoder().encode(`a@${domain253}`).length, 255);
        assert.throws(() => isIdnEmailAddress(`a@${domain253}`), /larger than 254 octets/);
    });

    // Recheck the complete mailbox after ACE expansion rather than returning an oversized result.
    test('enforces the converted mailbox octet limit', () => {
        const domain = `${Array(31).fill('é').join('.')}.aaaaa`;
        assert.equal(new TextEncoder().encode(domain).length < 253, true);
        assert.throws(() => idnEmailAddress(`a@${domain}`), /converted email address is larger than 254 octets/);
    });
};
