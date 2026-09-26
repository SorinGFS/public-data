'use strict';
// Dispatch explicit public test concerns across eligible package-version layers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe: suite } = require('node:test');
const {
    discoverConcernEntryPoints,
    discoverVersionLayerSets,
} = require('../../version-layers.js');

const testsRoot = __dirname;
const packageRoot = path.resolve(testsRoot, '../../..');
const packageMetadata = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const subject = require(packageRoot);
const layerSets = discoverVersionLayerSets(testsRoot, packageMetadata.version);

// Preserve semantic layer order while delegating each explicit concern to its owner.
for (const layer of layerSets.exact) {
    const concerns = discoverConcernEntryPoints([layer]);

    // Register concern suites with package-root-relative source paths.
    for (const concern of concerns) {
        const register = require(concern.entryPoint);
        const concernPath = path.relative(packageRoot, concern.entryPoint).split(path.sep).join('/');
        assert.equal(typeof register, 'function', `${path.relative(testsRoot, concern.entryPoint)} must export a registration function.`);
        const concernSuite = (description, callback) => suite(`${description} (${concernPath}):`, callback);
        register(subject, { layer: concern.layer, packageRoot, suite: concernSuite, testsRoot });
    }
}
