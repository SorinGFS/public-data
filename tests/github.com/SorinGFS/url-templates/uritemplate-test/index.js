'use strict';
// Register every downloaded uritemplate-test case through Node.js's built-in test runner.
const assert = require('node:assert/strict');
const path = require('node:path');
const { suite, test } = require('node:test');

const fixtureFiles = [
    'spec-examples.json',
    'spec-examples-by-section.json',
    'extended-tests.json',
    'negative-tests.json',
];

// Register the RFC 6570 expansion suite against the package API supplied by the root dispatcher.
module.exports = (subject, { packageRoot }) => {
    const { parseUrlTemplate } = subject;

    // Load each fixture file independently so failures identify their source.
    for (const fixtureFile of fixtureFiles) {
        const fixturePath = path.join(__dirname, fixtureFile);
        const fixtureId = path.relative(packageRoot, fixturePath).split(path.sep).join('/');
        const groups = require(fixturePath);

        // Register every named group as a suite using the variables supplied by that group.
        for (const [groupName, group] of Object.entries(groups)) {
            suite(`${groupName} (${fixtureId}):`, () => {
                // Validate rejected templates and expand every valid template independently.
                for (const [template, expected] of group.testcases) {
                    const label = template;
                    test(label, () => {
                        if (expected === false) {
                            assert.throws(() => parseUrlTemplate(template).expand(group.variables), undefined, label);
                        } else {
                            const actual = parseUrlTemplate(template).expand(group.variables);
                            const accepted = Array.isArray(expected) ? expected : [expected];
                            assert.ok(accepted.includes(actual), `${label}\nexpected: ${accepted.join(' OR ')}\nactual:   ${actual}`);
                        }
                    });
                }
            });
        }
    }
};
