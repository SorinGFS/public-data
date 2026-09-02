'use strict';
// Dispatch numeric fixtures and explicit concern suites across eligible package-version layers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
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
const configuration = fs.existsSync(configurationPath) ? JSON.parse(fs.readFileSync(configurationPath, 'utf8')) : {};
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

// Preserve semantic layer order, registering numeric fixtures before explicit concerns within each layer.
for (const layer of fixtureLayers) {
    // Register every selected numbered fixture independently through the configured package callback.
    for (const descriptor of fixturesByLayer.get(layer.name)) {
        const fixture = JSON.parse(fs.readFileSync(descriptor.path, 'utf8'));
        const description = typeof fixture.description === 'string' ? fixture.description : 'invalid fixture description';
        const label = `${descriptor.id} / ${description}`;
        const callback = getFixtureCallback();
        test(label, () => {
            assert.equal(typeof fixture.description, 'string', `${descriptor.id} must have a description.`);
            assert.ok(Object.hasOwn(fixture, 'data'), `${descriptor.id} must have data.`);
            assert.equal(typeof fixture.valid, 'boolean', `${descriptor.id} must have a boolean valid result.`);
            if (fixture.valid) assert.equal(callback(fixture.data), true, label);
            else assert.throws(() => callback(fixture.data), undefined, label);
        });
    }

    // Keep explicit concerns on exact scope because compatibility describes only the fixture callback.
    for (const concern of concernsByLayer.get(layer.name) ?? []) {
        const register = require(concern.entryPoint);
        assert.equal(typeof register, 'function', `${path.relative(testsRoot, concern.entryPoint)} must export a registration function.`);
        register(subject, { layer: concern.layer, packageRoot, testsRoot });
    }
}
