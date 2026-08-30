'use strict';
// Verify relative-reference generation and round-trip preservation.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { format } = require('node:util');
// Register this concern against the package API supplied by the root test entry point.
module.exports = (id) => {
    // Register each table row as an independently reported Node.js test.
    const testEach = (cases) => (name, callback) => {
        // Preserve fixture order while formatting each row with its supplied values.
        for (const values of cases) test(format(name, ...values), () => callback(...values));
    };


    // Verify relative-reference generation and round trips through reference resolution.
    describe('toRelativeReference IRI', () => {
        testEach([
            ['https://examplé.com/var/lib', 'https://examplé.com', '/var/lib'],
            ['https://examplé.com/var/lib', 'https://examplé.com/z', 'var/lib'],
            ['https://examplé.com/a/var/lib', 'https://examplé.com/a', 'a/var/lib'],
            ['https://examplé.com/a/var/lib', 'https://examplé.com/a/', 'var/lib'],
            ['https://examplé.com/foo/test/bar/package.json', 'https://examplé.com/foo/test', 'test/bar/package.json'],
            ['https://examplé.com/var', 'https://examplé.com/var/lib', '../var'],
            ['https://examplé.com/bin', 'https://examplé.com/var/lib', '../bin'],
            ['https://examplé.com/var/lib', 'https://examplé.com/var/lib', ''],
            ['https://examplé.com/var/apache', 'https://examplé.com/var/lib', 'apache'],
            ['https://examplé.com/Users/a/web/b', 'https://examplé.com/Users/a/web/b/test/mails', '../../b'],
            ['https://examplé.com/foo/bar/baz', 'https://examplé.com/foo/bar/baz-quux', 'baz'],
            ['https://examplé.com/foo/bar/baz-quux', 'https://examplé.com/foo/bar/baz', 'baz-quux'],
            ['https://examplé.com/baz', 'https://examplé.com/baz-quux', 'baz'],
            ['https://examplé.com/baz-quux', 'https://examplé.com/baz', 'baz-quux'],
            ['https://examplé.com/', 'https://examplé.com/page1/page2/foo', '../../'],
        ])('toRelativeIri(%s, %s) => %s', (target, base, expected) => {
            const relative = id.toRelativeReference(target, base);
            assert.equal(relative, expected);
            assert.equal(id.resolveReference(relative, base), target); // sanity check
        });
    });

    describe('toRelativeReference URI', () => {
        testEach([
            ['https://example.com/var/lib', 'https://example.com', '/var/lib'],
            ['https://example.com/var/lib', 'https://example.com/z', 'var/lib'],
            ['https://example.com/a/var/lib', 'https://example.com/a', 'a/var/lib'],
            ['https://example.com/a/var/lib', 'https://example.com/a/', 'var/lib'],
            ['https://example.com/foo/test/bar/package.json', 'https://example.com/foo/test', 'test/bar/package.json'],
            ['https://example.com/var', 'https://example.com/var/lib', '../var'],
            ['https://example.com/bin', 'https://example.com/var/lib', '../bin'],
            ['https://example.com/var/lib', 'https://example.com/var/lib', ''],
            ['https://example.com/var/apache', 'https://example.com/var/lib', 'apache'],
            ['https://example.com/Users/a/web/b', 'https://example.com/Users/a/web/b/test/mails', '../../b'],
            ['https://example.com/foo/bar/baz', 'https://example.com/foo/bar/baz-quux', 'baz'],
            ['https://example.com/foo/bar/baz-quux', 'https://example.com/foo/bar/baz', 'baz-quux'],
            ['https://example.com/baz', 'https://example.com/baz-quux', 'baz'],
            ['https://example.com/baz-quux', 'https://example.com/baz', 'baz-quux'],
            ['https://example.com/', 'https://example.com/page1/page2/foo', '../../'],
        ])('toRelativeIri(%s, %s) => %s', (target, base, expected) => {
            const relative = id.toRelativeReference(target, base);
            assert.equal(relative, expected);
            assert.equal(id.resolveReference(relative, base), target); // sanity check
        });
    });

    // Verify empty components and path forms that require explicit inheritance control.
    describe('toRelativeReference component presence', () => {
        // Require every generated reference to have the expected form and resolve back to its target.
        testEach([
            ['clears a query on the same absolute path', 'https://example.com/a/item', 'https://example.com/a/item?old', '/a/item'],
            ['preserves an empty target query', 'https://example.com/a/item?', 'https://example.com/a/item?old', '?'],
            ['preserves an empty target fragment', 'https://example.com/a/item#', 'https://example.com/a/item', '#'],
            ['clears a query on an empty path', 'https://example.com', 'https://example.com?old', '//example.com'],
            ['clears a query on a colon-containing rootless path', 'urn:a:b', 'urn:a:b?old', './a:b'],
            ['produces an empty path from a non-empty base path', 'https://example.com', 'https://example.com/a', '//example.com'],
            ['produces a root path from a single-segment base path', 'https://example.com/', 'https://example.com/a', '/'],
            ['preserves a trailing slash on a rootless directory', 'urn:a/', 'urn:a/b', './'],
            ['protects a colon-containing first path segment', 'urn:a:b', 'urn:c', './a:b'],
            ['falls back for an empty rootless target path', 'urn:', 'urn:a', 'urn:'],
            ['falls back when rootless parent traversal changes path form', 'urn:a', 'urn:a/', 'urn:a'],
        ])('%s', (description, target, base, expected) => {
            const relative = id.toRelativeReference(target, base);
            assert.equal(relative, expected);
            assert.equal(id.resolveReference(relative, base), target);
        });
    });

    // Reconstruct the documented 2,646-case URI/IRI component matrix.
    const matrixFamilies = [
        {
            name: 'URI',
            prefix: 'https://example.com',
            paths: ['', '/', '/a', '/a/', '/a/b', '/b', '/a:b'],
            queries: ['', '?', '?query'],
            fragments: ['', '#', '#fragment'],
        },
        {
            name: 'IRI',
            prefix: 'https://examplé.com',
            paths: ['', '/', '/é', '/é/', '/é/ß', '/ß', '/é:ß'],
            queries: ['', '?', '?fóo'],
            fragments: ['', '#', '#bár'],
        },
    ];
    let matrixCaseCount = 0;

    describe('toRelativeReference exhaustive component matrix', () => {
        // Exercise equivalent ASCII URI and Unicode IRI component families.
        for (const family of matrixFamilies) {
            // Compare every target path with every possible base path.
            for (const targetPath of family.paths) {
                // Cover same-path, ancestor, descendant, sibling, empty, and colon-segment relationships.
                for (const basePath of family.paths) {
                    // Distinguish an absent target query from empty and non-empty queries.
                    for (const targetQuery of family.queries) {
                        // Verify query inheritance against every base-query presence state.
                        for (const baseQuery of family.queries) {
                            // Distinguish an absent target fragment from empty and non-empty fragments.
                            for (const targetFragment of family.fragments) {
                                const target = family.prefix + targetPath + targetQuery + targetFragment;
                                const base = family.prefix + basePath + baseQuery;
                                const description = `${family.name}: ${JSON.stringify(target)} relative to ${JSON.stringify(base)}`;
                                matrixCaseCount++;
                                // Register each combination separately so failures identify every component state.
                                test(description, () => {
                                    const relative = id.toRelativeReference(target, base);
                                    assert.equal(
                                        id.resolveReference(relative, base),
                                        target,
                                        `Generated reference ${JSON.stringify(relative)} must round-trip`,
                                    );
                                });
                            }
                        }
                    }
                }
            }
        }
    });

    // Guard the documented matrix size against accidental fixture drift.
    assert.equal(matrixCaseCount, 2_646);

};
