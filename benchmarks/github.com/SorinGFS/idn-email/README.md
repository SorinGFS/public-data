# Public benchmark layout

This directory is the single entry point for the materialized benchmark suite. It registers isolated package loading plus four representative function scenarios across both package exports.

Run the standard workload with:

```sh
npm run benchmark
```

The package command invokes `node ./#/public/benchmarks`. Reduced and machine-readable runs are available through:

```sh
node ./#/public/benchmarks --quick
node ./#/public/benchmarks --quick --json
```

## Portability

The coordinator is shared unchanged with other packages. It uses explicit concern entry points, package API injection, Node path APIs, deterministic discovery, and no external benchmark runner. It delegates exact or cumulative layer selection and ordered concern discovery to the extension-managed `#/version-layers.js` v0.5 runtime.

```text
#/public/benchmarks/
  index.js
  README.md
  _load-time/
    index.js
  idn-email/
    index.js
  is-idn-email/
    index.js
```

Within each eligible version layer, nonversion concern directories are loaded lexically through `<concern>/index.js`. An optional `index.json` may enable cumulative cross-major layer discovery with `"backwardsCompatible": true`; the default is exact-scope discovery.

## Registered measurements

The suite measures:

- isolated package entry-point loading;
- `isIdnEmail("user@example.com")`;
- `isIdnEmail("δοκιμή@mañana.example")`;
- `idnEmail("user@example.com")`;
- `idnEmail("δοκιμή@mañana.example")`.

A function concern registers a named package callback and JSON-serializable arguments:

```js
'use strict';
// Register representative validation measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'isIdnEmail',
        args: ['user@example.com'],
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

`npm run benchmark` intentionally retains 100,000 iterations per sample and rejects forwarded custom iterations.

Performance values are observations rather than assertions. CI should use quick mode as an execution check and compare measurements only across equivalent environments.
