'use strict';
// Dispatch numeric fixtures and explicit concern suites across eligible package-version layers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const testsRoot = __dirname;
const packageRoot = path.resolve(testsRoot, '../../..');
const packageMetadata = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const subject = require(packageRoot);
const versionPattern = /^v(0|[1-9]\d*)(?:\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?)?$/;
let fixtureCallback;

// Compare directory and file names without locale-dependent ordering.
const compareNames = (left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0;

// Compare numeric directory or JSON fixture names without integer-size or leading-zero ambiguity.
const compareNumericNames = (left, right) => {
    const leftNumber = BigInt(left.name.replace(/\.json$/, ''));
    const rightNumber = BigInt(right.name.replace(/\.json$/, ''));
    if (leftNumber < rightNumber) return -1;
    if (leftNumber > rightNumber) return 1;
    return compareNames(left, right);
};

// Parse a version-layer name into its numeric components.
const parseVersionLayer = (name) => {
    const match = versionPattern.exec(name);
    return match ? match.slice(1).filter((part) => part !== undefined).map(Number) : undefined;
};

// Compare complete semantic versions in major, minor, and patch order.
const compareVersions = (left, right) => {
    // Return the first differing component so complete layers remain numerically ordered.
    for (let index = 0; index < 3; index++) {
        if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
};

// Read direct child directories while excluding filesystem links and loose files.
const readDirectories = (root) => fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

// Select base, major, minor, and introduced-at-version layers in their required order.
const discoverVersionLayers = (root, packageVersionString) => {
    const packageVersionMatch = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+].*)?$/.exec(packageVersionString);
    assert.ok(packageVersionMatch, `Unsupported package version: ${packageVersionString}`);
    const packageVersion = packageVersionMatch.slice(1, 4).map(Number);
    const versionLayers = new Map();

    // Index every valid version directory before selecting eligible layers.
    for (const entry of readDirectories(root)) {
        const version = parseVersionLayer(entry.name);
        if (version) versionLayers.set(entry.name, { name: entry.name, root: path.join(root, entry.name), version });
    }

    const layers = [{ name: '.', root }];
    const majorLayer = versionLayers.get(`v${packageVersion[0]}`);
    if (majorLayer) layers.push(majorLayer);
    const minorLayer = versionLayers.get(`v${packageVersion[0]}.${packageVersion[1]}`);
    if (minorLayer) layers.push(minorLayer);
    const completeLayers = [...versionLayers.values()]
        .filter((layer) => layer.version.length === 3)
        .filter((layer) => layer.version[0] === packageVersion[0] && compareVersions(layer.version, packageVersion) <= 0)
        .sort((left, right) => compareVersions(left.version, right.version));
    layers.push(...completeLayers);
    return layers;
};

const layers = discoverVersionLayers(testsRoot, packageMetadata.version);

// Resolve the configured package callback only when numeric fixtures require it.
const getFixtureCallback = () => {
    if (fixtureCallback) return fixtureCallback;
    const configurationPath = path.join(testsRoot, 'index.json');
    assert.ok(fs.existsSync(configurationPath), 'Numeric fixtures require #/public/tests/index.json.');
    const configuration = JSON.parse(fs.readFileSync(configurationPath, 'utf8'));
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
