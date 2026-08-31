'use strict';
// Dispatch numeric fixtures and explicit concern suites across eligible package-version layers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { compareNames, compareNumericNames, discoverVersionLayers, readDirectories, versionPattern } = require('../../version-layers.js');

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
const layers = discoverVersionLayers(testsRoot, packageMetadata.version, {
    backwardsCompatible: configuration.backwardsCompatible ?? false,
});
const suiteLayers = new Set(discoverVersionLayers(testsRoot, packageMetadata.version).map((layer) => layer.name));
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

// Process each eligible layer without recursively treating nested version selectors as concerns.
for (const layer of layers) {
    const directories = readDirectories(layer.root);
    const numericDirectories = directories
        .filter((entry) => /^\d+$/.test(entry.name))
        .sort(compareNumericNames);

    // Register numbered JSON fixtures before any nonnumeric concern suite in the layer.
    for (const directory of numericDirectories) {
        const collectionRoot = path.join(layer.root, directory.name);
        const fixtureFiles = fs.readdirSync(collectionRoot, { withFileTypes: true })
            .filter((entry) => entry.isFile() && /^\d+\.json$/.test(entry.name))
            .sort(compareNumericNames);
        assert.ok(fixtureFiles.length > 0, `${layer.name}/${directory.name} contains no numbered JSON fixtures.`);
        const callback = getFixtureCallback();

        // Register every fixture independently while preserving its source identifier.
        for (const fixtureFile of fixtureFiles) {
            const fixture = JSON.parse(fs.readFileSync(path.join(collectionRoot, fixtureFile.name), 'utf8'));
            const prefix = layer.name === '.' ? '' : `${layer.name}/`;
            const fixtureId = `${prefix}${directory.name}/${fixtureFile.name}`;
            const description = typeof fixture.description === 'string' ? fixture.description : 'invalid fixture description';
            const label = `${fixtureId} / ${description}`;
            test(label, () => {
                assert.equal(typeof fixture.description, 'string', `${fixtureId} must have a description.`);
                assert.ok(Object.hasOwn(fixture, 'data'), `${fixtureId} must have data.`);
                assert.equal(typeof fixture.valid, 'boolean', `${fixtureId} must have a boolean valid result.`);
                if (fixture.valid) assert.equal(callback(fixture.data), true, label);
                else assert.throws(() => callback(fixture.data), undefined, label);
            });
        }
    }

    // Keep explicit concern suites on exact-scope semantics because compatibility describes only the fixture callback.
    if (suiteLayers.has(layer.name)) {
        const concernDirectories = directories
            .filter((entry) => !/^\d+$/.test(entry.name) && !versionPattern.test(entry.name))
            .filter((entry) => fs.existsSync(path.join(layer.root, entry.name, 'index.js')))
            .sort(compareNames);

        // Load explicit suite entry points after numeric fixtures and pass the package API to each registrar.
        for (const concern of concernDirectories) {
            const suitePath = path.join(layer.root, concern.name, 'index.js');
            const register = require(suitePath);
            assert.equal(typeof register, 'function', `${path.relative(testsRoot, suitePath)} must export a registration function.`);
            register(subject, { layer: layer.name, packageRoot, testsRoot });
        }
    }
}
