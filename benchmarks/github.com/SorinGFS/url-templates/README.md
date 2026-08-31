# Public benchmark layout

This directory is the single entry point for the materialized benchmark suite. It registers isolated package loading plus ten representative scenarios across all five package exports.

Run the standard workload with:

```sh
npm run benchmark
```

Run reduced or machine-readable workloads directly:

```sh
node ./#/public/benchmarks --quick
node ./#/public/benchmarks --quick --json
```

## Portability and discovery

The coordinator is shared unchanged with the other libraries. It uses explicit concern entry points, package API injection, deterministic Node path handling, and no external benchmark runner. Version-layer selection and ordered concern discovery are delegated to the extension-managed `#/version-layers.js` v0.5 runtime.

```text
#/public/benchmarks/
  index.js
  README.md
  _load-time/
  compile/
  inspect/
  is-url-template/
  parse-template/
  recursive-compile/
```

Within each eligible version layer, nonversion concern directories are loaded lexically through `<concern>/index.js`. An optional `index.json` may enable cumulative cross-major discovery through `"backwardsCompatible": true`; exact-scope discovery is the default.

## Registered measurements

The suite measures:

- isolated package entry-point loading;
- `isUrlTemplate` validation of a simple path and a complex query expression;
- `inspect` AST construction for the same representative forms;
- validated `parseTemplate` expander construction for simple and composite templates;
- unvalidated `compile` expander construction for simple and composite templates;
- `recursiveCompile` direct and multi-pass expansion.

`parseTemplate` and `compile` return expander objects, so their scenarios measure creation of those objects. `recursiveCompile` provides complete expansion measurements through a named package export. The returned values are consumed by the harness but are not included in measured output formatting.

A concern registers a named package callback and JSON-serializable arguments:

```js
'use strict';
// Register representative validation measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'isUrlTemplate',
        args: ['/users/{id}'],
    });
};
```

A package-load concern calls `benchmarkLoad('package entry point')`. Registrars also receive `layer`, `packageRoot`, and `benchmarksRoot`; they must not hardcode a relative package import.

## Measurement behavior

Each function scenario records the first five calls in a fresh child process, warms the callback, and then records repeated per-operation samples. Package load time is measured inside a fresh process for every sample, excluding child-process startup.

Reports include minimum, median, 95th percentile, maximum, integer operations per second, arguments, workload counts, package version, Node.js version, operating system, architecture, and CPU. Human-readable durations use milliseconds with six digits after the decimal delimiter.

| Setting | Default | Quick mode |
| --- | ---: | ---: |
| warm-up iterations | 10,000 | 100 |
| iterations per sample | 100,000 | 1,000 |
| samples | 10 | 3 |
| load samples | 20 | 3 |

`BENCHMARK_WARMUP`, `BENCHMARK_SAMPLES`, and `BENCHMARK_LOAD_SAMPLES` accept positive-integer overrides. Direct invocation may choose iterations explicitly:

```sh
node ./#/public/benchmarks --iterations 250000
```

`npm run benchmark` intentionally retains 100,000 iterations per sample and rejects forwarded custom iterations. Performance values are observations rather than assertions; comparisons require equivalent runtime and runner environments.
