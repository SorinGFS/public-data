// Exercise the apply script with isolated files and mocked Nix commands.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const source = fs.readFileSync(path.resolve(__dirname, '../../../app.sh'), 'utf8');
const bash = spawnSync('bash', ['-c', 'command -v bash'], { encoding: 'utf8' }).stdout.trim();
const utilities = ['realpath', 'mkdir', 'flock', 'cat', 'mktemp', 'rm', 'mv', 'cmp'];
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";

// Route only declared utilities to their current-environment executables.
function setup() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply fixture '));
    const machine = path.join(dir, 'machine');
    const state = path.join(dir, 'state');
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(machine); fs.mkdirSync(bin);
    fs.writeFileSync(path.join(machine, 'configuration.nix'), '{ ... }: {}\n');
    fs.writeFileSync(path.join(machine, 'hardware-configuration.nix'), '# hardware\n');
    for (const name of utilities) {
        const found = spawnSync(bash, ['-c', 'command -v "$1"', '_', name], { encoding: 'utf8' }).stdout.trim();
        assert(found, name);
        fs.writeFileSync(path.join(bin, name), '#!' + bash + '\nexec ' + quote(found) + ' "$@"\n', { mode: 0o700 });
    }
    const stat = spawnSync(bash, ['-c', 'command -v stat'], { encoding: 'utf8' }).stdout.trim();
    fs.writeFileSync(path.join(bin, 'stat'), '#!' + bash + '\nif [[ $2 == %u ]]; then echo 0; else exec ' + quote(stat) + ' "$@"; fi\n', { mode: 0o700 });
    fs.writeFileSync(path.join(bin, 'id'), '#!' + bash + '\necho "${TEST_UID}"\n', { mode: 0o700 });
    // Native spies enforce the current-directory update contract.
    const mock = `#!${process.execPath}
const fs = require('node:fs');
const name = require('node:path').basename(process.argv[1]);
const args = process.argv.slice(2);
const valid = name === 'nix' ? JSON.stringify(args) === JSON.stringify(['--extra-experimental-features','nix-command flakes','flake','update']) && process.cwd() === process.env.TEST_TARGET : JSON.stringify(args) === JSON.stringify(['switch','--flake','path:' + process.env.TEST_TARGET + '#desktop']);
if (!valid) { console.error('unexpected native invocation', name, args, process.cwd()); process.exit(98); }
fs.appendFileSync(process.env.TEST_LOG, JSON.stringify({name,args,cwd:process.cwd()}) + '\\n');
if (name === 'nix') fs.writeFileSync(process.env.TEST_TARGET + '/flake.lock', 'mock updated lock\\n');
if (process.env.TEST_FAIL === name) process.exit(2);
`;
    for (const name of ['nix', 'nixos-rebuild']) fs.writeFileSync(path.join(bin, name), mock, { mode: 0o700 });
    // Inject fixture paths and ownership only in memory, not through a public bypass.
    const script = source.replace('machine=/etc/nixos', 'machine=' + quote(machine))
        .replace('state=/var/lib/nixos-desktop', 'state=' + quote(state));
    const log = path.join(dir, 'log');
    return { dir, machine, state, run(options = {}) {
        const result = spawnSync(bash, ['--noprofile', '--norc', '-c', script, 'apply', options.system || 'x86_64-linux'], {
            encoding: 'utf8', timeout: 10000,
            env: { PATH: bin, HOME: dir, BASH_ENV: '/dev/null', TEST_UID: options.uid ?? '0', TEST_TARGET: state, TEST_LOG: log, TEST_FAIL: options.fail || '' }
        });
        assert.ifError(result.error);
        return result;
    }, calls() { return fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse) : []; },
    close() { fs.rmSync(dir, { recursive: true, force: true }); } };
}

// The base selection is identical with or without an unrelated existing machine flake.
for (const withFlake of [false, true]) test('apply and repeat preserve machine sources; flake=' + withFlake, () => {
    const f = setup();
    try {
        if (withFlake) { fs.writeFileSync(path.join(f.machine, 'flake.nix'), 'unrelated\n'); fs.writeFileSync(path.join(f.machine, 'flake.lock'), 'original\n'); }
        const before = Object.fromEntries(fs.readdirSync(f.machine).map(name => [name, fs.readFileSync(path.join(f.machine, name), 'utf8')]));
        let r = f.run({ system: 'aarch64-linux' }); assert.equal(r.status, 0, r.stderr);
        const generated = fs.readFileSync(path.join(f.state, 'flake.nix'), 'utf8');
        assert.match(generated, /system = "aarch64-linux"/); assert.match(generated, /flake = false/);
        assert(generated.includes('inputs.machine.outPath + "/configuration.nix"'));
        assert(generated.includes(f.machine)); assert.equal(fs.statSync(f.state).mode & 0o777, 0o700);
        r = f.run({ system: 'aarch64-linux' }); assert.equal(r.status, 0, r.stderr);
        assert.equal(fs.readFileSync(path.join(f.state, 'flake.nix'), 'utf8'), generated);
        assert.deepEqual(f.calls().map(x => x.name), ['nix', 'nixos-rebuild', 'nix', 'nixos-rebuild']);
        assert.deepEqual(Object.fromEntries(fs.readdirSync(f.machine).map(name => [name, fs.readFileSync(path.join(f.machine, name), 'utf8')])), before);
    } finally { f.close(); }
});

// Refuse missing inputs and unsafe owned state before native commands.
test('preflight and collisions fail without native calls', () => {
    for (const kind of ['root', 'missing', 'state-link', 'state-mode', 'target-link', 'target-directory', 'different', 'lock-link']) {
        const f = setup();
        try {
            if (kind === 'missing') fs.unlinkSync(path.join(f.machine, 'configuration.nix'));
            if (kind === 'state-link') fs.symlinkSync(f.machine, f.state);
            if (['state-mode', 'target-link', 'target-directory', 'different', 'lock-link'].includes(kind)) {
                const old = process.umask(0);
                try { fs.mkdirSync(f.state, { mode: kind === 'state-mode' ? 0o777 : 0o700 }); } finally { process.umask(old); }
            }
            if (kind === 'target-link') fs.symlinkSync(path.join(f.machine, 'configuration.nix'), path.join(f.state, 'flake.nix'));
            if (kind === 'target-directory') fs.mkdirSync(path.join(f.state, 'flake.nix'));
            if (kind === 'different') fs.writeFileSync(path.join(f.state, 'flake.nix'), 'unrelated\n');
            if (kind === 'lock-link') fs.symlinkSync(path.join(f.machine, 'configuration.nix'), path.join(f.state, 'flake.lock'));
            const r = f.run({ uid: kind === 'root' ? '1234' : '0' }); assert.notEqual(r.status, 0, kind);
            assert.deepEqual(f.calls(), [], kind); assert.doesNotMatch(r.stdout, /configuration applied/);
        } finally { f.close(); }
    }
});

// Native failures retain generated state and do not claim success.
test('update and rebuild failures stop at the failing stage', () => {
    for (const fail of ['nix', 'nixos-rebuild']) {
        const f = setup();
        try {
            const r = f.run({ fail }); assert.notEqual(r.status, 0); assert.doesNotMatch(r.stdout, /configuration applied/);
            assert.deepEqual(f.calls().map(x => x.name), fail === 'nix' ? ['nix'] : ['nix', 'nixos-rebuild']);
            assert(fs.existsSync(path.join(f.state, 'flake.nix'))); assert(fs.existsSync(path.join(f.state, 'flake.lock')));
        } finally { f.close(); }
    }
});
