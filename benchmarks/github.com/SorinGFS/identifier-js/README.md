# Public benchmark layout

This directory is the single entry point for the materialized public benchmark suite. Run the complete suite with:

```sh
npm run benchmark
```

The package command invokes:

```sh
node ./#/public/benchmarks
```

Use the reduced workload for runner smoke checks:

```sh
node ./#/public/benchmarks --quick
```

Add `--json` to emit a machine-readable report suitable for a CI artifact.

## Portability and version layers

The benchmark structure is intended to be portable across projects and CI runners. It uses explicit concern entry points, package API injection, Node path APIs, deterministic discovery, and no external benchmark runner. The dispatcher delegates exact or cumulative layer selection and ordered concern discovery to the extension-managed `#/version-layers.js` v0.5 runtime.

Benchmark layers follow the same eligibility and ordering contract as public tests:

1. `.` always;
2. matching `v<major>`;
3. matching `v<major>.<minor>`;
4. eligible complete versions in ascending order within the package major.

Within each layer, nonversion concern directories are loaded lexically through `<concern>/index.js`. Loose files are ignored.

## Concern structure

Each exported package function owns a concern directory. A concern can add more representative inputs without mixing measurements for unrelated functions.

```text
#/public/benchmarks/
  index.js
  README.md
  load-time/
    index.js
  parse-uri/
    index.js
  is-uri/
    index.js
  v1/
    parse-uri/
      index.js
```

A function concern exports a registration function:

```js
'use strict';
// Register parseUri cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'parseUri',
        args: ['https://example.com/path?query#fragment'],
    });
};
```

The callback must be a named function exported by the package. Arguments must be JSON-serializable so the harness can reproduce first-call measurements in a fresh process.

A package-load concern uses the dedicated registration function:

```js
'use strict';
// Register isolated package-entry-point loading measurements.
module.exports = (_subject, { benchmarkLoad }) => {
    benchmarkLoad('package entry point');
};
```

The registrar also receives `layer`, `packageRoot`, and `benchmarksRoot` for cases that need layer-aware metadata. Concerns must not hardcode a relative path to the package entry point.

## Measurement modes

Every function registration produces two complementary measurements:

1. **Initial calls:** a fresh child process loads the package and records the first five invocations individually.
2. **Warm engine:** the coordinator performs a configured warm-up, measures repeated batches, and reports per-operation statistics and throughput.

Package load time is measured inside a fresh child process for every sample. Child-process startup time is outside the reported interval.

The harness consumes operation results, executes registrations serially, and reports minimum, median, 95th percentile, and maximum measurements where applicable. It records package, Node.js, platform, architecture, and CPU metadata with the report.

The human-readable report prints workload counts at the beginning and places each representative argument list directly in its benchmark heading. Initial invocations use distinct `initial call 1`, `initial call 2`, and subsequent rows so progression toward warmed execution remains visible. All reported durations use milliseconds, scalar results are right-aligned, and measured timing values use six digits after the decimal delimiter. JSON fields such as `initialCallsMs` and `warmMsPerOperation` state their timing units explicitly; throughput remains operations per second and is rounded to an integer.

## Workload configuration

The default workload can be changed without editing benchmark sources:

| Environment variable | Default | Quick mode |
| --- | ---: | ---: |
| `BENCHMARK_WARMUP` | 10,000 | 100 |
| `BENCHMARK_SAMPLES` | 10 | 3 |
| `BENCHMARK_LOAD_SAMPLES` | 20 | 3 |

Positive-integer environment values override the listed defaults and quick-mode values.

Iterations per sample default to 100,000, or 1,000 under `--quick`. A custom iteration count is supported by direct invocation:

```sh
node ./#/public/benchmarks --iterations 250000
```

Every function benchmark records exactly five initial calls. `npm run benchmark` uses the standard 100,000 iterations per sample and rejects a forwarded `--iterations` option. Custom iteration counts are intentionally limited to direct Node.js invocation. A concern may override `warmup` or `samples` when an operation requires a different workload; iteration selection remains an invocation-level setting.

## Interpreting CI results

Benchmark execution fails when discovery, configuration, package loading, callback invocation, or report generation fails. Performance values themselves are observations rather than test assertions.

Shared CI runners can vary significantly. Recommended CI use is to:

- run `--quick` as an execution smoke check;
- preserve `--json` output as an artifact;
- compare results only when Node version, operating system, architecture, and runner class are comparable;
- use repeated controlled or dedicated runners before enforcing regression thresholds;
- avoid treating one timing sample as evidence of a performance change.

The harness does not force garbage collection or subtract an estimated empty-loop cost. Those policies can distort results and should be introduced only for a benchmark with an explicit measurement rationale.
