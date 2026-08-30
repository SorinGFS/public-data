'use strict';
// Register every downloaded uritemplate-test case through Node.js's built-in test runner.
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');

const fixtureFiles = [
    'spec-examples.json',
    'spec-examples-by-section.json',
    'extended-tests.json',
    'negative-tests.json',
];

// Register the RFC 6570 expansion suite against the package API supplied by the root dispatcher.
module.exports = (subject) => {
    const { parseTemplate } = subject;

    // Load each fixture file independently so failures identify their source.
    for (const fixtureFile of fixtureFiles) {
        const groups = require(path.join(__dirname, fixtureFile));

        // Register every named group with the variables supplied by that group.
        for (const [groupName, group] of Object.entries(groups)) {
            // Validate rejected templates and expand every valid template independently.
            for (const [template, expected] of group.testcases) {
                const label = `${fixtureFile} / ${groupName} / ${template}`;
                test(label, () => {
                    if (expected === false) {
                        assert.throws(() => parseTemplate(template).expand(group.variables), undefined, label);
                    } else {
                        const actual = parseTemplate(template).expand(group.variables);
                        const accepted = Array.isArray(expected) ? expected : [expected];
                        assert.ok(accepted.includes(actual), `${label}\nexpected: ${accepted.join(' OR ')}\nactual:   ${actual}`);
                    }
                });
            }
        }
    }
};
