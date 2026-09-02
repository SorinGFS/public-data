'use strict';
// Verify RFC URI/IRI normalization, explicit URI output, and registered-name mapping.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
// Register parsed-result normalization concerns against the package API supplied by the root test entry point.
module.exports = (subject) => {
    // Route shared cases through the IRI-reference parser before invoking lazy normalization.
    const id = Object.assign({}, subject, {
        normalize: (reference, options) => subject.parseIriReference(reference).normalize(options),
    });

    // Cover generic component normalization and recognized scheme transformations.
    describe('parsed normalize generic syntax', () => {
        // Apply case, percent-triplet, unreserved, and path transformations component by component.
        test('normalizes a complete URI reference', () => {
            assert.equal(
                id.normalize('HTTP://Example.COM/%7e/a/../b?x=%2f#%41'),
                'http://example.com/~/b?x=%2F#A',
            );
        });

        // Preserve component-specific case while normalizing each allowed percent-encoded value.
        test('normalizes authority and data components independently', () => {
            assert.equal(
                id.normalize('x://Us%65r@EX%41MPLE/%7e/%2f?x=%41%2f#%7e%23'),
                'x://User@example/~/%2F?x=A%2F#~%23',
            );
        });

        // Keep delimiters that distinguish present-empty components from absent components.
        test('preserves empty userinfo, host, port, query, and fragment components', () => {
            assert.equal(id.normalize('x://@HOST:/path?#'), 'x://@host:/path?#');
            assert.equal(id.normalize('///path?#'), '///path?#');
            assert.equal(id.normalize('file:///path'), 'file:///path');
        });

        // Avoid Unicode case or normalization changes in an internationalized registered name and path.
        test('preserves existing Unicode spelling', () => {
            const value = 'HTTPS://ÉXAMPLE.测试/Cafe\u0301';
            assert.equal(id.normalize(value), 'https://ÉXAMPLE.测试/Cafe\u0301');
        });

        // Remove dot segments from an identifier containing a scheme after decoding unreserved dots.
        test('removes dot segments from an absolute identifier path', () => {
            assert.equal(id.normalize('x:/a/%2e/b/../c'), 'x:/a/c');
            assert.equal(id.normalize('file:///a/./b/../c'), 'file:///a/c');
        });

        // Remove dot segments where an authority or absolute-path reference fixes path interpretation.
        test('removes dot segments from network and absolute-path references', () => {
            assert.equal(id.normalize('//EXAMPLE.com/a/./b/../c'), '//example.com/a/c');
            assert.equal(id.normalize('/a/./b/../c'), '/a/c');
        });

        // Preserve rootless relative traversal because removing it can change later base resolution.
        test('preserves rootless relative dot segments', () => {
            assert.equal(id.normalize('../a/%2e/b/../c'), '../a/./b/../c');
        });

        // Restrict path processing so similar query and fragment text remains ordinary data.
        test('does not process dot-segment text outside the path', () => {
            assert.equal(id.normalize('g?x/../y#s/../t'), 'g?x/../y#s/../t');
        });

        // Avoid turning a no-authority path into a network-path or authority during recomposition.
        test('preserves no-authority paths when reduction would produce two leading slashes', () => {
            assert.equal(id.normalize('x:/..//a'), 'x:/..//a');
            assert.equal(id.normalize('/..//a'), '/..//a');
        });

        // Decode every percent-encoded ASCII unreserved octet licensed by generic equivalence.
        test('decodes every ASCII unreserved percent encoding', () => {
            const unreserved = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
            // Isolate each encoded character in a query so path dot-segment rules cannot interfere.
            for (const character of unreserved) {
                const hexadecimal = character.charCodeAt(0).toString(16).padStart(2, '0');
                assert.equal(id.normalize(`?%${hexadecimal}`), `?${character}`);
            }
        });

        // Preserve every encoded reserved delimiter while standardizing its hexadecimal case.
        test('preserves every percent-encoded reserved character', () => {
            const reserved = ':/?#[]@!$&\'()*+,;=';
            // Isolate each encoded delimiter so no literal delimiter can change component structure.
            for (const character of reserved) {
                const hexadecimal = character.charCodeAt(0).toString(16).padStart(2, '0');
                assert.equal(id.normalize(`?%${hexadecimal}`), `?%${hexadecimal.toUpperCase()}`);
            }
        });

        // Retain the empty reference as the identity element of reference resolution.
        test('preserves an empty reference', () => {
            assert.equal(id.normalize(''), '');
        });

        // Retain percent encoding when decoding it would reclassify a registered name as IPv4.
        test('preserves registered-name host kind', () => {
            assert.equal(
                id.normalize('x://%31%39%32.0.2.1/'),
                'x://%31%39%32.0.2.1/',
            );
        });

        // Remove every decimal spelling of the HTTP and WebSocket scheme default ports.
        test('removes HTTP and WebSocket default ports', () => {
            assert.equal(id.normalize('HTTP://EXAMPLE.COM:80'), 'http://example.com/');
            assert.equal(id.normalize('HTTPS://EXAMPLE.COM:00443/a'), 'https://example.com/a');
            assert.equal(id.normalize('WS://EXAMPLE.COM:00080'), 'ws://example.com/');
            assert.equal(id.normalize('WSS://EXAMPLE.COM:443/chat'), 'wss://example.com/chat');
            assert.equal(id.normalize('HTTP://EXAMPLE.COM:80/path?#'), 'http://example.com/path?#');
            assert.equal(id.normalize('HTTP://[0:0:0:0:0:0:0:1]:80'), 'http://[::1]/');
            assert.equal(id.normalize(`http://example.com:${'0'.repeat(1_000)}80`), 'http://example.com/');
        });

        // Use a slash for recognized authority-based schemes whose parsed path is empty.
        test('normalizes empty HTTP and WebSocket paths', () => {
            const parsed = subject.parseUriReference('HTTP://EXAMPLE.COM');
            assert.equal(parsed.normalize(), 'http://example.com/');
            assert.equal(parsed.path, '');
            assert.equal(id.normalize('HTTPS://EXAMPLE.COM?#'), 'https://example.com/?#');
            assert.equal(id.normalize('WS://EXAMPLE.COM?chat'), 'ws://example.com/?chat');
            assert.equal(id.normalize('WSS://EXAMPLE.COM'), 'wss://example.com/');
        });

        // Remove empty ports only for recognized schemes while preserving non-default values.
        test('preserves other port states', () => {
            assert.equal(id.normalize('HTTP://EXAMPLE.COM:443'), 'http://example.com:443/');
            assert.equal(id.normalize('HTTPS://EXAMPLE.COM:80'), 'https://example.com:80/');
            assert.equal(id.normalize('WS://EXAMPLE.COM:'), 'ws://example.com/');
            assert.equal(id.normalize('WSS://EXAMPLE.COM:80'), 'wss://example.com:80/');
            assert.equal(id.normalize('x://EXAMPLE.COM:'), 'x://example.com:');
        });
    });

    // Cover deterministic IP-literal handling independently from registered-name mappers.
    describe('parsed normalize IP literals', () => {
        // Enforce RFC 5952 leading-zero, compression, tie, and lowercase requirements.
        test('canonicalizes ordinary IPv6 forms', () => {
            const cases = [
                ['x://[2001:0DB8:0:0:0:0:2:1]/', 'x://[2001:db8::2:1]/'],
                ['x://[2001:0:0:1:0:0:1:1]/', 'x://[2001::1:0:0:1:1]/'],
                ['x://[2001:db8:0:1:1:1:1:1]/', 'x://[2001:db8:0:1:1:1:1:1]/'],
                ['x://[0:0:0:0:0:0:0:0]/', 'x://[::]/'],
                ['x://[0:0:0:0:0:0:0:1]/', 'x://[::1]/'],
            ];
            // Check each canonicalization rule through independently chosen address shapes.
            for (const [input, expected] of cases) assert.equal(id.normalize(input), expected);
        });

        // Use mixed notation for standardized prefixes with IPv4 embedded in the low-order bits.
        test('canonicalizes known embedded-IPv4 address forms', () => {
            const cases = [
                ['x://[0:0:0:0:0:0:192.0.2.1]/', 'x://[::192.0.2.1]/'],
                ['x://[0:0:0:0:0:ffff:192.0.2.1]/', 'x://[::ffff:192.0.2.1]/'],
                ['x://[0:0:0:0:ffff:0:192.0.2.1]/', 'x://[::ffff:0:192.0.2.1]/'],
                ['x://[64:ff9b:0:0:0:0:192.0.2.1]/', 'x://[64:ff9b::192.0.2.1]/'],
            ];
            // Verify every recognized prefix while preserving the final IPv4 address numerically.
            for (const [input, expected] of cases) assert.equal(id.normalize(input), expected);
        });

        // Use hexadecimal output when the address does not identify an embedded-IPv4 prefix.
        test('canonicalizes unknown mixed IPv6 forms as hexadecimal', () => {
            assert.equal(id.normalize('x://[2001:db8::192.0.2.1]/'), 'x://[2001:db8::c000:201]/');
        });

        // Apply generic case normalization rather than IPv6 serialization to IPvFuture literals.
        test('normalizes IPvFuture host case', () => {
            assert.equal(id.normalize('x://[V1.ABC:def]/'), 'x://[v1.abc:def]/');
        });

        // Preserve the already unambiguous RFC 3986 IPv4 spelling.
        test('preserves IPv4 address spelling', () => {
            assert.equal(id.normalize('x://192.168.1.1/path'), 'x://192.168.1.1/path');
        });
    });

    // Cover the optional synchronous extension point for DNS and application name policies.
    describe('parsed normalize registered-name mapper', () => {
        // Supply the current internationalized name and use the returned ASCII representation.
        test('maps a registered name through structured options', () => {
            let received;
            let calls = 0;
            // Record the sole mapper input while standing in for an external IDNA implementation.
            const mapRegName = (regName) => {
                calls++;
                received = regName;
                return 'XN--EXMPLE-CUA.COM';
            };
            assert.equal(
                id.normalize('https://Exämple.com/%7e', { mapRegName }),
                'https://xn--exmple-cua.com/~',
            );
            assert.equal(received, 'Exämple.com');
            assert.equal(calls, 1);
        });

        // Select a validated Unicode registered-name representation through structured options.
        test('maps an ACE name to Unicode IRI output', () => {
            let received;
            // Model an external validator's Unicode rendering of an accepted ACE hostname.
            const mapRegName = (regName) => {
                received = regName;
                return '例え.テスト';
            };
            const parsed = subject.parseIri('https://XN--R8JZ45G.XN--ZCKZAH/%7e');
            assert.equal(parsed.normalize({ mapRegName }), 'https://例え.テスト/~');
            assert.equal(parsed.normalize({ toUri: false, mapRegName }), 'https://例え.テスト/~');
            assert.equal(received, 'XN--R8JZ45G.XN--ZCKZAH');
        });

        // Invoke the mapper before generic percent and ASCII host normalization.
        test('passes the current registered-name spelling to the mapper', () => {
            let received;
            // Return the unmodified value so the generic phase remains directly observable.
            const mapRegName = (regName) => {
                received = regName;
                return regName;
            };
            assert.equal(id.normalize('x://EX%41MPLE', { mapRegName }), 'x://example');
            assert.equal(received, 'EX%41MPLE');
            const parsed = subject.parseIriReference('x://example');
            parsed.host = 'É.example';
            assert.equal(parsed.normalize({ mapRegName }), 'x://É.example');
            assert.equal(received, 'É.example');
            assert.equal(parsed.host, 'É.example');
        });

        // Keep non-name host kinds and absent or empty hosts outside the mapper contract.
        test('does not invoke the mapper for non-registered-name hosts', () => {
            let calls = 0;
            // Count accidental invocations without changing any supplied value.
            const mapRegName = (regName) => {
                calls++;
                return regName;
            };
            const references = ['x:/path', 'file:///path', 'x://192.168.1.1/', 'x://[::1]/', 'x://[v1.a]/'];
            // Exercise every host category excluded from registered-name processing.
            for (const reference of references) id.normalize(reference, { mapRegName });
            assert.equal(calls, 0);
        });

        // Treat a numeric name that fails IPv4 syntax as a generic registered name.
        test('invokes the mapper for a numeric registered name', () => {
            let received;
            // Record the name that must not be misclassified as an IPv4 address.
            const mapRegName = (regName) => {
                received = regName;
                return regName;
            };
            assert.equal(id.normalize('x://01.2.3.4/', { mapRegName }), 'x://01.2.3.4/');
            assert.equal(received, '01.2.3.4');
        });

        // Reject a non-callable mapper before attempting host normalization.
        test('rejects a non-function mapper option', () => {
            // Invoke the public API with invalid structured options.
            assert.throws(() => id.normalize('x://example', { mapRegName: {} }), TypeError);
        });

        // Enforce only the mapper interface's declared return type.
        test('rejects a non-string mapper result', () => {
            // Return a non-string value to exercise the extension result boundary.
            assert.throws(() => id.normalize('x://example', { mapRegName: () => undefined }), TypeError);
        });

        // Treat the registered-name mapper's returned text as application-owned policy.
        test('accepts arbitrary string mapper results', () => {
            // Exercise text that this package must normalize without judging as a registered name.
            assert.equal(id.normalize('x://example', { mapRegName: () => '' }), 'x://');
            assert.equal(id.normalize('x://example', { mapRegName: () => 'FUCK YOU' }), 'x://fuck you');
            assert.equal(id.normalize('x://example', { mapRegName: () => 'user@host' }), 'x://user@host');
            assert.equal(id.normalize('x://example', { mapRegName: () => '192.0.2.1' }), 'x://192.0.2.1');
            assert.equal(
                id.normalize('x://example', { mapRegName: () => '%31%39%32.0.2.1' }),
                'x://192.0.2.1',
            );
            assert.equal(
                subject.parseUriReference('x://example').normalize({ mapRegName: () => 'é.example' }),
                'x://é.example',
            );
            assert.equal(
                subject.parseIriReference('x://example').normalize({
                    toUri: true,
                    mapRegName: () => '\uE000',
                }),
                'x://%EE%80%80',
            );
        });

        // Preserve the mapper's own failure rather than disguising its policy decision.
        test('propagates mapper errors', () => {
            const expected = new Error('IDNA policy failure');
            // Throw the sentinel that must remain observable to the caller.
            const mapRegName = () => {
                throw expected;
            };
            assert.throws(() => id.normalize('x://example', { mapRegName }), (error) => error === expected);
        });
    });

    // Verify explicit RFC 3987 IRI-to-URI output across every Unicode-capable component.
    describe('parsed normalize URI output', () => {
        // Map a domain to ACE and UTF-8 percent-encode userinfo, path, query, and fragment text.
        test('encodes every internationalized component without mutation', () => {
            const parsed = subject.parseIri('https://usér@例え.テスト/a/../café?q=資料\uE000#結果');
            const components = Object.assign({}, parsed);
            let received;
            let calls = 0;
            // Stand in for a strict external IDNA mapper returning validated ACE text.
            const mapRegName = (regName) => {
                calls++;
                received = regName;
                return 'xn--r8jz45g.xn--zckzah';
            };
            assert.equal(
                parsed.normalize({ toUri: true, mapRegName }),
                'https://us%C3%A9r@xn--r8jz45g.xn--zckzah/caf%C3%A9?q=%E8%B3%87%E6%96%99%EE%80%80#%E7%B5%90%E6%9E%9C',
            );
            assert.equal(received, '例え.テスト');
            assert.equal(calls, 1);
            assert.deepEqual(Object.assign({}, parsed), components);
        });

        // Preserve each complete, relative, or fragment-free parser category in URI form.
        test('maps every IRI parser result to its corresponding URI grammar', () => {
            const cases = [
                ['parseIri', 'x:résumé#結果', 'x:r%C3%A9sum%C3%A9#%E7%B5%90%E6%9E%9C', 'isUri'],
                ['parseIriReference', '../résumé?q=資料#結果', '../r%C3%A9sum%C3%A9?q=%E8%B3%87%E6%96%99#%E7%B5%90%E6%9E%9C', 'isUriReference'],
                ['parseAbsoluteIri', 'x:résumé?q=資料', 'x:r%C3%A9sum%C3%A9?q=%E8%B3%87%E6%96%99', 'isAbsoluteUri'],
            ];
            // Validate every emitted string through the URI operation paired with its IRI parser.
            for (const [parser, input, expected, validator] of cases) {
                const output = subject[parser](input).normalize({ toUri: true });
                assert.equal(output, expected);
                assert.equal(subject[validator](output), true);
            }
        });

        // Retain existing percent triplets while encoding supplementary Unicode scalars once.
        test('preserves encoded octets and encodes supplementary characters', () => {
            assert.equal(
                id.normalize('x:/%c3%a9/%7e/😀?x=%e8%b3%87&y=😀#%41😀', { toUri: true }),
                'x:/%C3%A9/~/%F0%9F%98%80?x=%E8%B3%87&y=%F0%9F%98%80#A%F0%9F%98%80',
            );
        });

        // Use RFC 3987 percent encoding for an internationalized generic registered name.
        test('encodes a generic Unicode registered name without a mapper', () => {
            const normalized = id.normalize('x://É.example/資料', { toUri: true });
            assert.equal(normalized, 'x://%C3%89.example/%E8%B3%87%E6%96%99');
            assert.equal(id.normalize(normalized, { toUri: true }), normalized);
        });

        // Leave DNS-oriented hostname representation entirely to the optional mapper.
        test('does not validate mapped names for recognized schemes', () => {
            const parsed = subject.parseIri('https://例え.テスト/');
            assert.equal(
                parsed.normalize({ toUri: true }),
                'https://%E4%BE%8B%E3%81%88.%E3%83%86%E3%82%B9%E3%83%88/',
            );
            assert.equal(
                parsed.normalize({ toUri: true, mapRegName: (regName) => regName }),
                'https://%E4%BE%8B%E3%81%88.%E3%83%86%E3%82%B9%E3%83%88/',
            );
            assert.equal(
                parsed.normalize({ toUri: true, mapRegName: () => 'xn--r8jz45g.xn--zckzah' }),
                'https://xn--r8jz45g.xn--zckzah/',
            );
        });

        // Keep URI parser results compatible with the same explicit output option.
        test('accepts URI output for existing URI parser results', () => {
            assert.equal(
                subject.parseUri('HTTP://EXAMPLE.COM:80/%7e?q=%2f#%41').normalize({ toUri: true }),
                'http://example.com/~?q=%2F#A',
            );
        });

        // Reject malformed structured options at the public method boundary.
        test('validates normalization options', () => {
            const parsed = subject.parseIriReference('x:é');
            assert.equal(parsed.normalize({}), 'x:é');
            assert.throws(() => parsed.normalize(() => 'example'), TypeError);
            assert.throws(() => parsed.normalize({ toUri: 'yes' }), TypeError);
            assert.throws(() => parsed.normalize({ mapRegName: true }), TypeError);
            assert.throws(() => parsed.normalize(null), TypeError);
            assert.throws(() => parsed.normalize([]), TypeError);
        });
    });

    // Verify global properties across representative URI and IRI component categories.
    describe('parsed normalize properties', () => {
        // Expose lazy normalization on every parser result while removing the standalone package export.
        test('is available only through URI and IRI parse results', () => {
            const cases = [
                ['parseUri', 'x:a'],
                ['parseUriReference', '../a'],
                ['parseAbsoluteUri', 'x:a'],
                ['parseIri', 'x:é'],
                ['parseIriReference', '../é'],
                ['parseAbsoluteIri', 'x:é'],
            ];
            // Verify each public parser supplies the same non-enumerable terminal operation.
            for (const [parser, reference] of cases) {
                const parsed = subject[parser](reference);
                assert.equal(typeof parsed.normalize, 'function');
                assert.equal(parsed.normalizeReference, undefined);
                assert.equal(Object.keys(parsed).includes('normalize'), false);
            }
            assert.equal(subject.normalize, undefined);
            assert.equal(subject.normalizeReference, undefined);
            assert.equal(subject.isUri('x:a').normalize, undefined);
            assert.equal(subject.isIri('x:é').normalize, undefined);
        });

        // Keep parsed component spelling unchanged when lazy normalization is requested or ignored.
        test('does not normalize or mutate components unless its string result is requested', () => {
            const parsed = subject.parseUri('HTTP://Example.COM/a/../b');
            const components = Object.assign({}, parsed);
            assert.deepEqual(Object.assign({}, parsed), components);
            assert.equal(parsed.normalize(), 'http://example.com/b');
            assert.deepEqual(Object.assign({}, parsed), components);
        });
        // Derive output from the parse result's current component properties without rewriting them.
        test('reads its own parsed component properties directly', () => {
            const parsed = subject.parseIriReference('x:/a');
            parsed.path = '/b/../c';
            assert.equal(parsed.normalize(), 'x:/c');
            assert.equal(parsed.path, '/b/../c');
            parsed.path = '/café';
            assert.equal(parsed.normalize({ toUri: true }), 'x:/caf%C3%A9');
            assert.equal(parsed.path, '/café');
        });

        // Reject malformed references instead of repairing invalid percent encoding.
        test('rejects invalid input', () => {
            // Invoke normalization with malformed input that neither grammar accepts.
            assert.throws(() => id.normalize('x://example/%GG'), SyntaxError);
            assert.throws(() => id.normalize(42), TypeError);
        });

        // Keep URI output within URI syntax and IRI output within IRI syntax.
        test('produces references valid under their input grammar', () => {
            const uri = subject.parseUriReference('HTTP://Example.COM/%7e').normalize();
            const iri = subject.parseIriReference('HTTPS://例え.テスト/%7e').normalize();
            assert.equal(id.isUriReference(uri), true);
            assert.equal(id.isIriReference(iri), true);
        });

        // Require every built-in transformation to reach a fixed point after one application.
        test('is idempotent without a mapper', () => {
            const references = [
                'HTTP://Example.COM/%7e/a/../b?x=%2f#%41',
                'HTTP://EXAMPLE.COM:00080/path?#',
                '//EXAMPLE.com/a/./b/../c',
                '../a/%2e/b/../c',
                'https://ÉXAMPLE.测试/Cafe\u0301',
                'x://[2001:0DB8:0:0:0:0:2:1]/',
                'file:///a/../b?',
                'x:/..//a',
            ];
            // Compare one normalization pass with a second pass for every processing branch.
            for (const reference of references) {
                const normalized = id.normalize(reference);
                assert.equal(id.normalize(normalized), normalized);
            }
        });

        // Retain idempotence when the supplied registered-name policy is itself idempotent.
        test('is idempotent with an idempotent mapper', () => {
            // Model a deterministic ASCII domain mapper.
            const mapRegName = (regName) => regName.toLowerCase();
            const normalized = id.normalize('x://EXAMPLE.COM/%7e', { mapRegName });
            assert.equal(id.normalize(normalized, { mapRegName }), normalized);
        });
    });
};
