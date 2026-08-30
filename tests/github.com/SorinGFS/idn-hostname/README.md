# Public test layout

This directory is the single entry point for the materialized public test suite. It retains package fixtures in version-specific layers and registers only the layers eligible for the tested package version. The numeric collections are cumulative: `v15.1` contains 108 fixtures, `v16.0` carries those fixtures followed by seven Unicode 16 additions, and `v17.0` carries those 115 fixtures followed by seven Unicode 17 additions. For `idn-hostname@17.0.1`, those 122 package fixtures and 6,202 applicable Unicode 17.0.0 `IdnaTestV2.txt` vectors are active. Run it through the package command:

```sh
npm test
```

The package command must invoke:

```sh
node ./#/public/tests
```

Node loads `index.js`, which discovers fixtures and suites explicitly. It does not use `*.test.js` discovery.

## Portability and CI use

This structure is intended to be reusable across projects. The dispatcher, directory rules, version-layer behavior, JSON fixture shape, and suite-registration contract remain the same; each project supplies only its package exports, optional `index.json` callback selection, fixtures, and concern suites. The dispatcher imports the extension-managed `#/version-layers.js` helper so public and private tools share one version-selection implementation.

The structure is designed for CI runners:

- one package command runs the complete materialized suite;
- deterministic layer and directory ordering produces repeatable registration order;
- explicit suite entry points avoid runner-specific file-discovery rules;
- Node's built-in test runner requires no separate test-runner dependency;
- filesystem paths are resolved with Node APIs rather than shell-specific syntax;
- failures in configuration, loading, fixtures, or tests produce an unsuccessful process exit.

The same command can therefore be used locally and in operating-system or Node-version CI matrices after the public workspace data has been materialized.

The Unicode 17.0 concern requires `process.versions.unicode` to be at least `17.0`. For official Node.js binaries, the supported package range starts at Node.js 24.13.1, excludes Node.js 25 because that line uses ICU 77.1, and resumes at Node.js 26.0.0.

## Directory structure

```text
#/public/tests/
  index.js
  index.json
  v15.1/
    0/                       # 108 Unicode 15.1 package fixtures
  v16.0/
    0/                       # 115 cumulative package fixtures through Unicode 16.0
  v17.0/
    0/                       # 122 cumulative package fixtures through Unicode 17.0
    idna-test-v2/
      index.js
      IdnaTestV2.txt
      IdnaMappingTable.txt
```

Other loose files and nonnumeric JSON fixture files are ignored. A nonnumeric directory is a test suite only when it contains `index.js`.

## Version layers

The dispatcher reads the package version from `package.json` and processes eligible layers in this order:

1. `.` always;
2. `v<major>` when the major matches;
3. `v<major>.<minor>` when both components match;
4. complete `v<major>.<minor>.<patch>` layers in ascending semantic-version order when they have the same major and are not newer than the package.

For package version `1.2.3`, examples are:

- eligible: `.`, `v1`, `v1.2`, `v1.0.0`, `v1.1.3`, and `v1.2.3`;
- ineligible: `v1.1`, `v1.2.4`, `v2`, and every complete `v2` layer.

A complete version layer never crosses its major-version boundary. For a package prerelease or build version, layer eligibility uses its numeric `major.minor.patch` core.

## Ordering within a layer

For every eligible layer, the dispatcher:

1. processes numeric directories in numeric order;
2. processes numbered JSON fixtures in each numeric directory in numeric order;
3. loads nonnumeric suite directories in lexical order.

Every numbered JSON fixture is registered as an independent `node:test` case.

## Numeric JSON fixtures

A numbered fixture has this shape:

```json
{
  "description": "rejects a non-string value",
  "data": 12,
  "valid": false
}
```

When an eligible numeric directory exists, `#/public/tests/index.json` must select a named function exported by the package:

```json
{
  "callback": "isIdnHostname"
}
```

The callback contract is:

- for `"valid": true`, calling the function with `data` must return `true` without throwing;
- for `"valid": false`, calling the function with `data` must throw.

The dispatcher verifies the fixture fields and reports the layer, collection, fixture filename, and description in the test name.

## Nonnumeric suites

Each concern suite exports a registration function from `<concern>/index.js`:

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');

module.exports = (subject) => {
    test('exposes the expected behavior', () => {
        assert.equal(subject.someFunction('input'), true);
    });
};
```

`subject` is the package API loaded once through the package's declared entry point. Suites must use this argument instead of hardcoding a relative path to the package root.

A suite may also accept dispatcher context:

```js
module.exports = (subject, { layer, packageRoot, testsRoot }) => {
    // Register tests for this concern and eligible layer.
};
```

Suite entry points register tests; they do not need to run a separate test runner.

## Failure behavior

The command exits unsuccessfully when fixture configuration is missing or invalid, a selected callback is unavailable, a suite entry point does not export a registration function, a test fails, or loading a test module throws.
