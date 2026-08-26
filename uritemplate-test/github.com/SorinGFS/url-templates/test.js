'use strict';
// Run every downloaded uritemplate-test case against the package root implementation.
const assert = require('node:assert/strict');
const path = require('node:path');
const { parseTemplate } = require('../../../index.js');

const fixtureFiles = [
    'spec-examples.json',
    'spec-examples-by-section.json',
    'extended-tests.json',
    'negative-tests.json',
];
let passed = 0;

// Load each fixture file independently so failures identify their source.
for (const fixtureFile of fixtureFiles) {
    const groups = require(path.join(__dirname, fixtureFile));

    // Run each group with the variables supplied by that group.
    for (const [groupName, group] of Object.entries(groups)) {
        // Validate rejected templates and expand every valid template.
        for (const [template, expected] of group.testcases) {
            const label = `${fixtureFile} / ${groupName} / ${template}`;
            if (expected === false) {
                assert.throws(() => parseTemplate(template).expand(group.variables), undefined, label);
            } else {
                const actual = parseTemplate(template).expand(group.variables);
                const accepted = Array.isArray(expected) ? expected : [expected];
                assert.ok(accepted.includes(actual), `${label}\nexpected: ${accepted.join(' OR ')}\nactual:   ${actual}`);
            }
            passed++;
        }
    }
}

console.log(`Passed ${passed} URI Template tests.`);
