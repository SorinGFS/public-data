# Public test layout

This directory is the single entry point for the materialized public test suite. Run it through the package command:

```sh
npm test
```

The package command must invoke:

```sh
node ./#/public/tests
```

Node loads `index.js`, which discovers fixtures and suites explicitly. It does not use `*.test.js` discovery.

## Portability and CI use

This structure is intended to be reusable across projects. The dispatcher, directory rules, version-layer behavior, JSON fixture shape, and suite-registration contract remain the same; each project supplies only its package exports, optional `index.json` callback selection, fixtures, and concern suites. The dispatcher delegates exact and cumulative layer selection, numbered-fixture traversal, and explicit concern discovery to the extension-managed `#/version-layers.js` v0.5 runtime.

The structure is designed for CI runners:

- one package command runs the complete materialized suite;
- deterministic layer and directory ordering produces repeatable registration order;
- explicit suite entry points avoid runner-specific file-discovery rules;
- Node's built-in test runner requires no separate test-runner dependency;
- filesystem paths are resolved with Node APIs rather than shell-specific syntax;
- failures in configuration, loading, fixtures, or tests produce an unsuccessful process exit.

The same command can therefore be used locally and in operating-system or Node-version CI matrices after the public workspace data has been materialized.

## Directory structure

```text
#/public/tests/
  index.js
  index.json                 # Required only when an eligible numeric fixture directory exists
  0/
    0.json
    1.json
    schema.json              # Ignored by the dispatcher
  behavior/
    index.js
  v1/
    0/
      0.json
    behavior/
      index.js
  v1.2/
    expansion/
      index.js
  v1.1.3/
    regression/
      index.js
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
  "callback": "isUrlTemplate"
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
