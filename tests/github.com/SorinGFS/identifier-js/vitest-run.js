'use strict';
// Stage materialized tests outside the # path so Vite can execute them against the canonical project.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '../../..');
const operationRoot = path.join(projectRoot, `workspace-data-tests-${process.pid}-${crypto.randomUUID()}`);
const stagingRoot = path.join(operationRoot, 'public', 'tests');

try {
    fs.mkdirSync(stagingRoot, { recursive: true });

    // Copy only active Vitest files while preserving their three-level path from the project root.
    for (const name of fs.readdirSync(__dirname)) {
        if (name.endsWith('.test.js')) {
            fs.copyFileSync(path.join(__dirname, name), path.join(stagingRoot, name));
        }
    }

    // Invoke the project-installed runner directly and propagate its observable result.
    const vitestRoot = path.dirname(require.resolve('vitest/package.json', { paths: [projectRoot] }));
    const result = spawnSync(process.execPath, [path.join(vitestRoot, 'vitest.mjs'), 'run', '--dir', stagingRoot], {
        cwd: projectRoot,
        stdio: 'inherit',
        windowsHide: true
    });
    if (result.error) {
        throw result.error;
    }
    process.exitCode = result.status === null ? 1 : result.status;
} finally {
    fs.rmSync(operationRoot, { recursive: true, force: true });
}
