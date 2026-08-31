'use strict';
// Discover versioned benchmark concerns and measure fresh-process and warmed execution behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
    discoverConcernEntryPoints,
    discoverVersionLayerSets,
    selectVersionLayers,
} = require('../../version-layers.js');

const benchmarksRoot = __dirname;
const packageRoot = path.resolve(benchmarksRoot, '../../..');
const resultMarker = '__BENCHMARK_RESULT__';

// Emit an isolated worker result without adding human-readable output.
const emitWorkerResult = (result) => process.stdout.write(`${resultMarker}${JSON.stringify(result)}\n`);

// Measure package loading inside a fresh process after the worker runtime has started.
if (process.argv[2] === '--worker-load') {
    const started = process.hrtime.bigint();
    require(packageRoot);
    emitWorkerResult({ durationNs: Number(process.hrtime.bigint() - started) });
    return;
}

// Measure the first invocations before the selected package function has been warmed.
if (process.argv[2] === '--worker-first-runs') {
    const descriptor = JSON.parse(Buffer.from(process.argv[3], 'base64url').toString('utf8'));
    const subject = require(packageRoot);
    const callback = subject[descriptor.callback];
    assert.equal(typeof callback, 'function', `Package export ${JSON.stringify(descriptor.callback)} is not a function.`);
    const durationsNs = [];
    let sink;

    // Record each initial invocation separately to retain the cold-to-warm progression.
    for (let index = 0; index < descriptor.runs; index++) {
        const started = process.hrtime.bigint();
        sink = callback.apply(subject, descriptor.args);
        durationsNs.push(Number(process.hrtime.bigint() - started));
    }
    emitWorkerResult({ durationsNs, sinkType: typeof sink });
    return;
}

// Parse a positive-integer environment override while retaining a deterministic default.
const readCount = (name, fallback) => {
    if (process.env[name] === undefined) return fallback;
    const value = Number(process.env[name]);
    assert.ok(Number.isSafeInteger(value) && value > 0, `${name} must be a positive integer.`);
    return value;
};

// Validate concern-level workload overrides before they control measurement loops.
const validateCount = (value, label) => {
    assert.ok(Number.isSafeInteger(value) && value > 0, `${label} must be a positive integer.`);
    return value;
};

let quick = false;
let jsonOnly = false;
let requestedIterations;

// Parse coordinator options explicitly so direct invocations can select their iteration count.
for (let index = 2; index < process.argv.length; index++) {
    const option = process.argv[index];
    if (option === '--quick') quick = true;
    else if (option === '--json') jsonOnly = true;
    else if (option === '--iterations') {
        assert.equal(requestedIterations, undefined, '--iterations may be supplied only once.');
        assert.ok(process.argv[index + 1] !== undefined, '--iterations requires a value.');
        requestedIterations = validateCount(Number(process.argv[index + 1]), '--iterations');
        index++;
    } else throw new Error(`Unknown benchmark option: ${option}`);
}
assert.ok(
    requestedIterations === undefined || process.env.npm_lifecycle_event !== 'benchmark',
    'Custom iterations require direct invocation with node ./#/public/benchmarks.',
);

const defaults = {
    initialCalls: 5,
    warmup: readCount('BENCHMARK_WARMUP', quick ? 100 : 10_000),
    iterations: requestedIterations ?? (quick ? 1_000 : 100_000),
    samples: readCount('BENCHMARK_SAMPLES', quick ? 3 : 10),
    loadSamples: readCount('BENCHMARK_LOAD_SAMPLES', quick ? 3 : 20),
};

// Select a stable percentile from a numeric sample without mutating its source.
const percentile = (values, fraction) => {
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
    return sorted[Math.max(0, index)];
};

// Decode the final structured result emitted by an isolated benchmark worker.
const runWorker = (mode, descriptor) => {
    const args = [__filename, mode];
    if (descriptor) args.push(Buffer.from(JSON.stringify(descriptor)).toString('base64url'));
    const result = spawnSync(process.execPath, args, {
        cwd: packageRoot,
        encoding: 'utf8',
        windowsHide: true,
    });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr || result.stdout || `${mode} worker failed.`);
    const line = result.stdout.split(/\r?\n/).findLast((candidate) => candidate.startsWith(resultMarker));
    assert.ok(line, `${mode} worker did not emit a benchmark result.`);
    return JSON.parse(line.slice(resultMarker.length));
};

// Summarize repeated measurements in units suitable for machine and human output.
const summarize = (values) => ({
    minimum: Math.min(...values),
    median: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    maximum: Math.max(...values),
});

const packageMetadata = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const subject = require(packageRoot);
const configurationPath = path.join(benchmarksRoot, 'index.json');
const configuration = fs.existsSync(configurationPath)
    ? JSON.parse(fs.readFileSync(configurationPath, 'utf8'))
    : {};
if (Object.hasOwn(configuration, 'backwardsCompatible')) {
    assert.equal(typeof configuration.backwardsCompatible, 'boolean', 'index.json.backwardsCompatible must be a boolean.');
}
const registrations = [];
const layerSets = discoverVersionLayerSets(benchmarksRoot, packageMetadata.version);
const layers = selectVersionLayers(layerSets, {
    backwardsCompatible: configuration.backwardsCompatible ?? false,
});
const concerns = discoverConcernEntryPoints(layers);

// Supply every selected concern with package APIs and centralized measurement registration.
for (const concern of concerns) {
    const concernId = concern.id;
    const register = require(concern.entryPoint);
    assert.equal(typeof register, 'function', `${concernId}/index.js must export a registration function.`);
    // Validate and retain one package-function measurement identified by its actual arguments.
    const benchmark = (options) => {
        assert.ok(options && typeof options === 'object', `${concernId} must supply benchmark options.`);
        const callback = options.callback;
        assert.equal(typeof callback, 'string', `${concernId} must select a callback.`);
        assert.equal(typeof subject[callback], 'function', `Package export ${JSON.stringify(callback)} is not a function.`);
        assert.ok(Array.isArray(options.args), `${concernId} args must be an array.`);
        const serializedArgs = JSON.stringify(options.args);
        assert.notEqual(serializedArgs, undefined, `${concernId} args must be JSON-serializable.`);
        assert.deepEqual(JSON.parse(serializedArgs), options.args, `${concernId} args must preserve their values through JSON.`);
        const benchmarkId = `${concernId} / ${serializedArgs}`;
        registrations.push({
            type: 'function',
            id: benchmarkId,
            callback,
            args: options.args,
            initialCalls: defaults.initialCalls,
            warmup: validateCount(options.warmup ?? defaults.warmup, `${benchmarkId} warmup`),
            iterations: defaults.iterations,
            samples: validateCount(options.samples ?? defaults.samples, `${benchmarkId} samples`),
        });
    };
    // Validate and retain one isolated package-load measurement.
    const benchmarkLoad = (name, options = {}) => {
        assert.equal(typeof name, 'string', `${concernId} benchmark-load names must be strings.`);
        assert.ok(name.length > 0, `${concernId} benchmark-load names must not be empty.`);
        assert.ok(options && typeof options === 'object', `${concernId}/${name} must supply benchmark-load options.`);
        registrations.push({
            type: 'load',
            id: `${concernId} / ${name}`,
            samples: validateCount(options.samples ?? defaults.loadSamples, `${concernId}/${name} samples`),
        });
    };
    register(subject, { benchmark, benchmarkLoad, layer: concern.layer, packageRoot, benchmarksRoot });
}
assert.ok(registrations.length > 0, 'No benchmarks were registered.');
assert.equal(new Set(registrations.map((registration) => registration.id)).size, registrations.length, 'Benchmark identifiers must be unique.');

const results = [];

// Execute registrations serially so concurrent work cannot contaminate timing samples.
for (const registration of registrations) {
    if (registration.type === 'load') {
        const durationsNs = [];

        // Use a new process for every package-load sample to avoid module-cache reuse.
        for (let sample = 0; sample < registration.samples; sample++) {
            durationsNs.push(runWorker('--worker-load').durationNs);
        }
        const durationMs = durationsNs.map((value) => value / 1_000_000);
        results.push({
            id: registration.id,
            type: registration.type,
            samples: registration.samples,
            durationMs: summarize(durationMs),
        });
        continue;
    }

    const first = runWorker('--worker-first-runs', {
        callback: registration.callback,
        args: registration.args,
        runs: registration.initialCalls,
    });
    const callback = subject[registration.callback];
    let sink;

    // Warm the selected function before collecting steady-state samples.
    for (let index = 0; index < registration.warmup; index++) {
        sink = callback.apply(subject, registration.args);
    }

    const sampleNsPerOperation = [];

    // Measure repeated batches and retain every per-operation sample for percentiles.
    for (let sample = 0; sample < registration.samples; sample++) {
        const started = process.hrtime.bigint();
        // Consume each result so benchmark calls remain observably used.
        for (let index = 0; index < registration.iterations; index++) {
            sink = callback.apply(subject, registration.args);
        }
        const durationNs = Number(process.hrtime.bigint() - started);
        sampleNsPerOperation.push(durationNs / registration.iterations);
    }

    const initialCallsMs = first.durationsNs.map((value) => value / 1_000_000);
    const warmMsPerOperation = summarize(sampleNsPerOperation.map((value) => value / 1_000_000));
    results.push({
        id: registration.id,
        type: registration.type,
        callback: registration.callback,
        args: registration.args,
        initialCallsMs,
        warmup: registration.warmup,
        iterations: registration.iterations,
        samples: registration.samples,
        warmMsPerOperation,
        medianOperationsPerSecond: Math.round(1_000 / warmMsPerOperation.median),
        sinkType: typeof sink,
    });
}

const cpu = os.cpus()[0];
const report = {
    schemaVersion: 1,
    package: { name: packageMetadata.name, version: packageMetadata.version },
    environment: {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        cpu: cpu?.model,
        logicalCpuCount: os.cpus().length,
    },
    configuration: { quick, ...defaults },
    results,
};

if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
} else {
    const labelWidth = 30;
    const valueWidth = 16;
    // Format every measured value with one unit, precision, and alignment policy.
    const formatValue = (value) => value.toFixed(6).padStart(valueWidth);
    // Print one scalar result with its decimal delimiter aligned to the other scalar results.
    const printMetric = (label, value, unit) => console.log(`  ${label.padEnd(labelWidth)}${formatValue(value)} ${unit}`);
    // Print count-like results as right-aligned integers without fractional digits.
    const printIntegerMetric = (label, value, unit) => console.log(`  ${label.padEnd(labelWidth)}${String(Math.round(value)).padStart(valueWidth)} ${unit}`);

    console.log(`${report.package.name}@${report.package.version}`);
    console.log(`Node ${report.environment.node} / ${report.environment.platform} ${report.environment.architecture}`);
    console.log(`${report.environment.cpu || 'Unknown CPU'} / ${report.environment.logicalCpuCount} logical CPUs`);
    console.log('\nWorkload');
    console.log(`  ${'initial calls'.padEnd(labelWidth)}${String(defaults.initialCalls).padStart(valueWidth)}`);
    console.log(`  ${'warm-up iterations'.padEnd(labelWidth)}${String(defaults.warmup).padStart(valueWidth)}`);
    console.log(`  ${'iterations per sample'.padEnd(labelWidth)}${String(defaults.iterations).padStart(valueWidth)}`);
    console.log(`  ${'samples'.padEnd(labelWidth)}${String(defaults.samples).padStart(valueWidth)}`);
    console.log(`  ${'total measured iterations'.padEnd(labelWidth)}${String(defaults.iterations * defaults.samples).padStart(valueWidth)}`);
    console.log(`  ${'load samples'.padEnd(labelWidth)}${String(defaults.loadSamples).padStart(valueWidth)}`);

    // Present each function's actual input and millisecond measurements instead of a generic scenario name.
    for (const result of results) {
        console.log(`\n${result.id}`);
        if (result.type === 'load') {
            printMetric('minimum', result.durationMs.minimum, 'ms');
            printMetric('median', result.durationMs.median, 'ms');
            printMetric('p95', result.durationMs.p95, 'ms');
            printMetric('maximum', result.durationMs.maximum, 'ms');
        } else {
            // Give every initial invocation its own row so progression toward warmed execution remains legible.
            for (let index = 0; index < result.initialCallsMs.length; index++) {
                printMetric(`initial call ${index + 1}`, result.initialCallsMs[index], 'ms');
            }
            printMetric('warm minimum', result.warmMsPerOperation.minimum, 'ms/op');
            printMetric('warm median', result.warmMsPerOperation.median, 'ms/op');
            printMetric('warm p95', result.warmMsPerOperation.p95, 'ms/op');
            printMetric('warm maximum', result.warmMsPerOperation.maximum, 'ms/op');
            printIntegerMetric('median throughput', result.medianOperationsPerSecond, 'ops/s');
        }
    }
}
