'use strict';
// Register every applicable Unicode 17.0 IdnaTestV2 vector against both public validation paths.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const EXPECTED_SOURCE_VERSION = '17.0.0';
const EXPECTED_SUMMARY = {
    applicable: 6202,
    nv8OrXv8: 189,
    trailingRoot: 0,
};

// Decode the empty-string marker and two escape forms defined by IdnaTestV2.
const decodeIdnaField = (value) => {
    if (value === '""') return '';
    return value
        .replace(/\\x\{([0-9a-fA-F]{1,6})\}/g, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 16)))
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, digits) => String.fromCharCode(Number.parseInt(digits, 16)));
};

// Convert a bracketed Unicode status field into its individual error identifiers.
const parseStatuses = (value) => {
    if (!value || value === '[]') return [];
    assert.ok(value.startsWith('[') && value.endsWith(']'), `Invalid IdnaTestV2 status field: ${value}`);
    return value.slice(1, -1).split(/[\s,]+/).filter(Boolean);
};

// Resolve inherited nontransitional fields exactly as specified by the Unicode fixture header.
const parseIdnaTests = (filename) => {
    const records = [];
    const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);

    // Retain source line numbers for stable diagnostics while ignoring comments and section headings.
    for (let lineNumber = 1; lineNumber <= lines.length; lineNumber++) {
        const data = lines[lineNumber - 1].split('#', 1)[0].trim();
        if (!data) continue;
        const fields = data.split(';').map((field) => field.trim());
        assert.ok(fields.length >= 5, `${filename}:${lineNumber}: expected at least five fields.`);
        const source = decodeIdnaField(fields[0]);
        const toUnicode = fields[1] ? decodeIdnaField(fields[1]) : source;
        const unicodeStatus = parseStatuses(fields[2]);
        const toAsciiN = fields[3] ? decodeIdnaField(fields[3]) : toUnicode;
        const asciiStatus = fields[4] ? parseStatuses(fields[4]) : unicodeStatus;
        records.push({ lineNumber, source, toUnicode, toAsciiN, asciiStatus });
    }
    return records;
};

// Expand Unicode's NV8/XV8 ranges into a direct lookup for IDNA2008 comparison exclusions.
const readComparisonExclusions = (filename) => {
    const excluded = new Uint8Array(0x110000);
    const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);

    // Index only ranges explicitly marked as incompatible with the package's final IDNA2008 policy.
    for (let lineNumber = 1; lineNumber <= lines.length; lineNumber++) {
        const data = lines[lineNumber - 1].split('#', 1)[0].trim();
        if (!data) continue;
        const fields = data.split(';').map((field) => field.trim());
        const marker = fields[3] || '';
        if (marker !== 'NV8' && marker !== 'XV8') continue;
        const [first, last = first] = fields[0].split('..').map((value) => Number.parseInt(value, 16));
        excluded.fill(1, first, last + 1);
    }
    return excluded;
};

// Compare dotted numeric versions for the runtime Unicode compatibility gate.
const compareVersions = (left, right) => {
    const leftParts = left.split('.').map(Number);
    const rightParts = right.split('.').map(Number);

    // Compare each component numerically and treat omitted patch components as zero.
    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
        const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
        if (difference !== 0) return Math.sign(difference);
    }
    return 0;
};

// Read fixture provenance from the authoritative Unicode header.
const declaredVersion = (filename) => {
    const match = fs.readFileSync(filename, 'utf8').match(/^#\s*Version:\s*(\d+\.\d+\.\d+)\s*$/m);
    assert.ok(match, `${filename}: missing Unicode version declaration.`);
    return match[1];
};

// Register official vectors after applying the package's documented stricter-policy exclusions.
module.exports = (subject) => {
    const testFile = path.join(__dirname, 'IdnaTestV2.txt');
    const mappingFile = path.join(__dirname, 'IdnaMappingTable.txt');
    const sourceVersion = declaredVersion(testFile);
    assert.equal(sourceVersion, EXPECTED_SOURCE_VERSION, 'Unexpected IdnaTestV2 Unicode version.');
    assert.equal(declaredVersion(mappingFile), sourceVersion, 'IDNA fixture versions must match.');
    assert.ok(
        compareVersions(process.versions.unicode, sourceVersion) >= 0,
        `Runtime Unicode ${process.versions.unicode} is older than fixture Unicode ${sourceVersion}.`,
    );
    const excludedCodePoints = readComparisonExclusions(mappingFile);
    const records = parseIdnaTests(testFile);
    const summary = { applicable: 0, nv8OrXv8: 0, trailingRoot: 0 };

    // Classify each vector before registering only those applicable to this package's policy.
    for (const record of records) {
        const relevantStatuses = record.asciiStatus.filter((status) => status !== 'U1');
        const expectedValid = relevantStatuses.length === 0;
        const containsComparisonExclusion = [...record.toUnicode]
            .some((character) => excludedCodePoints[character.codePointAt(0)] === 1);
        if (expectedValid && containsComparisonExclusion) {
            summary.nv8OrXv8++;
            continue;
        }
        if (expectedValid && record.toAsciiN.endsWith('.')) {
            summary.trailingRoot++;
            continue;
        }
        summary.applicable++;
        const expectation = expectedValid
            ? 'valid nontransitional ToASCII'
            : `invalid nontransitional ToASCII (${relevantStatuses.join(', ')})`;

        // Exercise validation and conversion together while reporting every vector independently.
        test(`IdnaTestV2.txt:${record.lineNumber} / ${expectation}`, () => {
            if (expectedValid) {
                assert.equal(subject.isIdnHostname(record.source), true);
                assert.equal(subject.idnHostname(record.source), record.toAsciiN);
            } else {
                assert.throws(() => subject.isIdnHostname(record.source));
                assert.throws(() => subject.idnHostname(record.source));
            }
        });
    }
    assert.deepEqual(summary, EXPECTED_SUMMARY, 'Applicable IdnaTestV2 vector inventory changed.');
};
