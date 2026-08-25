'use strict';
// Install Vitest once and replace the bootstrap command with the materialized test command.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '../../..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const testScript = 'node "#/public/tests/vitest-run.js"';
let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Install the runner in the canonical project when it has not been declared yet.
if (!packageJson.devDependencies?.vitest) {
    console.log('Installing Vitest...');
    execSync('npm install --save-dev vitest', { cwd: projectRoot, stdio: 'inherit' });
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

// Replace the one-time bootstrap command while preserving all unrelated package metadata.
if (packageJson.scripts?.test !== testScript) {
    console.log('Updating the test command...');
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts.test = testScript;
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}
