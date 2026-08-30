'use strict';
// Run the external RFC 6570 suite and every numbered package-validation fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isUrlTemplate } = require('../../../index.js');

// Execute the reusable expansion suite before the package-specific validation fixtures.
require('./uritemplate-test/index.js');

// Discover every numbered fixture collection while leaving non-numbered suites separate.
const fixtureCollections = fs.readdirSync(__dirname, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .sort((left, right) => Number.parseInt(left.name, 10) - Number.parseInt(right.name, 10));
assert.ok(fixtureCollections.length > 0, 'No numbered validation fixture collections were found.');
let passed = 0;

// Run each numbered JSON fixture in every numbered collection and ignore schema documents.
for (const collection of fixtureCollections) {
    const fixtureRoot = path.join(__dirname, collection.name);
    const fixtureFiles = fs.readdirSync(fixtureRoot)
        .filter((name) => /^\d+\.json$/.test(name))
        .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10));
    assert.ok(fixtureFiles.length > 0, `${collection.name} contains no numbered validation fixtures.`);

    // Verify each fixture's shape and its declared validation outcome independently.
    for (const fixtureFile of fixtureFiles) {
        const fixture = JSON.parse(fs.readFileSync(path.join(fixtureRoot, fixtureFile), 'utf8'));
        const fixtureId = `${collection.name}/${fixtureFile}`;
        const label = `${fixtureId} / ${fixture.description}`;
        assert.equal(typeof fixture.description, 'string', `${fixtureId} must have a description.`);
        assert.equal(typeof fixture.valid, 'boolean', `${fixtureId} must have a boolean valid result.`);
        if (fixture.valid) assert.equal(isUrlTemplate(fixture.data), true, label);
        else assert.throws(() => isUrlTemplate(fixture.data), undefined, label);
        passed++;
    }
}

console.log(`Passed ${passed} validation tests.`);
