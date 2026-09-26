# Public test layout

This directory is the single entry point for the materialized public test suite. Package fixtures are retained as version-specific deltas and registered only when their introduction version is not newer than the tested package. Run the suite through:

```sh
npm test
```

The package command invokes `node ./#/public/tests`. Node loads `index.js`, which discovers fixtures and explicit concern suites without `*.test.js` discovery or an external test runner.

## Portability and CI use

The dispatcher is shared unchanged with other packages. Each project supplies only its package exports, `index.json` callback selection, numbered fixtures, and optional concern suites. It delegates exact and cumulative layer selection, numbered-fixture traversal, and explicit concern discovery to the extension-managed `#/version-layers.js` v0.5 runtime.

The structure is suitable for local and CI use because it has one package command, deterministic ordering, explicit entry points, package API injection, platform-independent Node paths, and unsuccessful process exits for configuration, loading, or assertion failures.

## Active fixtures

```text
#/public/tests/
  index.js
  index.json
  address-api/   # replacement API and repaired SMTP mailbox behavior
  v15.1/
    0/             # 41 initial fixtures
  v16.0/
    0/             # 7 Unicode 16 additions
  v17.0/
    0/             # 7 Unicode 17 additions
```

`index.json` selects `isIdnEmailAddress` and declares its numeric fixture contract cumulative across release lines. The active totals are therefore:

- `15.1.x`: 41 numeric fixtures plus 13 address API scenarios, for 54 tests;
- `16.0.x`: 48 numeric fixtures plus 13 address API scenarios, for 61 tests;
- `17.0.x`: 55 numeric fixtures plus 13 address API scenarios, for 68 tests.

Each numbered JSON fixture and each root concern scenario is registered as an independent `node:test` case.

## Version layers

The dispatcher always includes the root and, by default, discovers matching major, major/minor, and eligible complete semantic-version layers. Because `index.json.backwardsCompatible` is `true`, numeric fixture layers accumulate across major versions when their normalized introduction point is not newer than the package version. Omitted components are zero, so `v15.1` means `15.1.0`. Layers run in ascending semantic order, with shorter equal versions first.

The setting applies only to numeric fixtures executed through `isIdnEmailAddress`. Explicit nonnumeric concern suites retain exact-scope version selection.

Within every eligible layer, numeric directories and their numbered JSON files run numerically before nonnumeric concern directories run lexically. Loose files, nonnumeric fixture filenames, and directories without `index.js` are ignored.

## Numeric fixtures

Each numeric suite contains a `schema.json` whose `description` supplies its report heading. A numbered fixture has this shape:

```json
{
  "description": "valid internationalized email",
  "data": "用户@example.com",
  "valid": true
}
```

Required properties appear in `description`, `data`, `valid` order; auxiliary metadata follows `valid`. Each description starts with lowercase `valid` or `invalid` matching the Boolean result.

For `"valid": true`, `isIdnEmailAddress(data)` must return `true`. For `"valid": false`, it must throw. The dispatcher reports each numeric suite as `<schema description> (<package-root-relative schema path>):` and each child as `<package-root-relative fixture path> / <fixture description>`.

## Explicit concerns

A nonnumeric suite exports a registration function from `<concern>/index.js` and receives the package API loaded once through the package entry point:

```js
'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');

module.exports = (subject) => {
    test('exposes the expected behavior', () => {
        assert.equal(subject.isIdnEmailAddress('user@example.com'), true);
    });
};
```

The optional second argument supplies `layer`, `packageRoot`, `suite`, and `testsRoot`. The path-aware `suite` wrapper appends the concern entry-point path to its heading. Concerns must use the injected API rather than hardcoding a package-relative import.

## Failure behavior

Routine fixture mismatches report only their actual and expected outcomes. Configuration, fixture-structure, loading, and direct concern failures retain full diagnostics.
