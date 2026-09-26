# Public tests

The root `index.js` dispatcher loads the package API once, discovers version-eligible explicit concerns through the generated `#/version-layers.js` runtime, and registers each concern as a real `node:test` suite.

## Concern structure

An explicit concern is a nonnumeric directory containing `index.js`. Its entry point exports a registration function:

```js
module.exports = (subject, context) => {
    context.suite('concern description', () => {
        // Register tests against subject.
    });
};
```

The context provides `layer`, `packageRoot`, `suite`, `testsRoot`. The injected `suite` function appends the package-root-relative concern entry-point path to the report heading.

Current concern:

- `behavior/index.js` — shared-cache behavior using isolated local HTTP origins and temporary cache stores.

## Report structure

Concern suites are reported as:

```text
concern description (#/public/tests/<concern>/index.js):
```

Individual cases use concise behavioral descriptions. Assertion and harness failures retain the diagnostics produced by Node's built-in test runner.

## Execution

From the package root:

```sh
npm test
```

The dispatcher uses Node's established suite API while retaining Node.js 20.12 compatibility through its equivalent `describe` export.
