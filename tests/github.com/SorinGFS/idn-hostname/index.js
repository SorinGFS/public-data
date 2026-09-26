'use strict';
// Dispatch numeric fixture suites and explicit concern suites across eligible package-version layers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe: suite, test } = require('node:test');
const {
    discoverConcernEntryPoints,
    discoverNumberedJsonFixtures,
    discoverVersionLayerSets,
    selectVersionLayers,
} = require('../../version-layers.js');

const testsRoot = __dirname;
const packageRoot = path.resolve(testsRoot, '../../..');
const packageMetadata = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const subject = require(packageRoot);
const configurationPath = path.join(testsRoot, 'index.json');
const configuration = fs.existsSync(configurationPath)
    ? JSON.parse(fs.readFileSync(configurationPath, 'utf8'))
    : {};
if (Object.hasOwn(configuration, 'backwardsCompatible')) {
    assert.equal(typeof configuration.backwardsCompatible, 'boolean', 'index.json.backwardsCompatible must be a boolean.');
}
const layerSets = discoverVersionLayerSets(testsRoot, packageMetadata.version);
const fixtureLayers = selectVersionLayers(layerSets, {
    backwardsCompatible: configuration.backwardsCompatible ?? false,
});
const fixturesByLayer = new Map(fixtureLayers.map((layer) => [layer.name, []]));
const concernsByLayer = new Map(layerSets.exact.map((layer) => [layer.name, []]));

// Group ordered descriptors without repeating filesystem traversal in the dispatcher.
for (const descriptor of discoverNumberedJsonFixtures(fixtureLayers)) {
    fixturesByLayer.get(descriptor.layer).push(descriptor);
}
for (const descriptor of discoverConcernEntryPoints(layerSets.exact)) {
    concernsByLayer.get(descriptor.layer).push(descriptor);
}
let fixtureCallback;

// Resolve the configured package callback only when numeric fixtures require it.
const getFixtureCallback = () => {
    if (fixtureCallback) return fixtureCallback;
    assert.ok(fs.existsSync(configurationPath), 'Numeric fixtures require #/public/tests/index.json.');
    assert.equal(typeof configuration.callback, 'string', 'index.json.callback must be a string.');
    assert.ok(configuration.callback.length > 0, 'index.json.callback must not be empty.');
    assert.equal(typeof subject[configuration.callback], 'function', `Package export ${JSON.stringify(configuration.callback)} is not a function.`);
    fixtureCallback = subject[configuration.callback].bind(subject);
    return fixtureCallback;
};

// Throw one-line diagnostics for routine callback mismatches already identified by the test label.
const failFixture = (actual, expected) => {
    const error = new Error(`actual: ${actual}; expected: ${expected}`);
    error.stack = undefined;
    throw error;
};

// Apply the shared callback contract while retaining full diagnostics for fixture-structure failures.
const assertFixtureResult = (callback, fixture) => {
    let actual;
    let thrown;
    try {
        actual = callback(fixture.data);
    } catch (error) {
        thrown = error;
    }
    if (fixture.valid) {
        if (thrown) failFixture(`threw ${thrown.name ?? 'Error'}: ${thrown.message ?? String(thrown)}`, 'true');
        if (actual !== true) failFixture(String(actual), 'true');
        return;
    }
    if (!thrown) failFixture(`returned ${String(actual)}`, 'throw');
};

// Preserve semantic layer order, registering numeric suites before explicit concerns within each layer.
for (const layer of fixtureLayers) {
    const fixturesBySuite = new Map();

    // Retain numeric suite order while grouping every schema with its data fixtures.
    for (const descriptor of fixturesByLayer.get(layer.name)) {
        if (!fixturesBySuite.has(descriptor.suite)) fixturesBySuite.set(descriptor.suite, []);
        fixturesBySuite.get(descriptor.suite).push(descriptor);
    }

    // Register each suite with a source-linked heading and independently linked cases.
    for (const descriptors of fixturesBySuite.values()) {
        const schemaPath = path.join(path.dirname(descriptors[0].path), 'schema.json');
        assert.ok(fs.existsSync(schemaPath), `${descriptors[0].id} requires a suite schema.json.`);
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        const schemaReference = path.relative(packageRoot, schemaPath).split(path.sep).join('/');
        const schemaDescription = typeof schema.description === 'string' ? schema.description : 'invalid schema description';

        suite(`${schemaDescription} (${schemaReference}):`, () => {
            for (const descriptor of descriptors) {
                const fixture = JSON.parse(fs.readFileSync(descriptor.path, 'utf8'));
                const fileReference = path.relative(packageRoot, descriptor.path).split(path.sep).join('/');
                const description = typeof fixture.description === 'string' ? fixture.description : 'invalid fixture description';
                const label = `${fileReference} / ${description}`;

                test(label, () => {
                    assert.equal(typeof schema.description, 'string', `${schemaReference} must have a description.`);
                    assert.equal(typeof fixture.description, 'string', `${fileReference} must have a description.`);
                    assert.ok(Object.hasOwn(fixture, 'data'), `${fileReference} must have data.`);
                    assert.equal(typeof fixture.valid, 'boolean', `${fileReference} must have a boolean valid result.`);
                    assert.match(
                        fixture.description,
                        fixture.valid ? /^valid\b/ : /^invalid\b/,
                        `${fileReference} description must start with its lowercase expected result.`,
                    );
                    assertFixtureResult(getFixtureCallback(), fixture);
                });
            }
        });
    }

    // Keep explicit concerns on exact scope because compatibility describes only the fixture callback.
    for (const concern of concernsByLayer.get(layer.name) ?? []) {
        const register = require(concern.entryPoint);
        const concernPath = path.relative(packageRoot, concern.entryPoint).split(path.sep).join('/');
        assert.equal(typeof register, 'function', `${path.relative(testsRoot, concern.entryPoint)} must export a registration function.`);
        const concernSuite = (description, callback) => suite(`${description} (${concernPath}):`, callback);
        register(subject, { layer: concern.layer, packageRoot, suite: concernSuite, testsRoot });
    }
}
