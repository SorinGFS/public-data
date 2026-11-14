// Exercise the fresh-install entrypoint with a closed PATH and harmless native-command fixtures.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const script = path.resolve(__dirname, '../../../install.sh');
// Discover current-environment executors rather than embedding host-specific binary paths.
const tools = spawnSync('bash', ['--noprofile', '--norc', '-c', 'command -v bash jq env python3'], { encoding: 'utf8', env: { PATH: process.env.PATH, BASH_ENV: '/dev/null' } }).stdout.trim().split('\n');
const [bash, jq, env, python] = tools;
const part = (name, extra = {}) => ({ name, type: 'part', size: '30G', bytes: 30000000000, fstype: null, label: null, partuuid: '11111111-' + name.split('/').pop().replace(/[^0-9]/g, ''), mountpoints: [null], pkname: '/dev/sda', ro: false, pttype: null, parttype: null, ...extra });
const fixture = { blockdevices: [
    { ...part('/dev/sda', { type: 'disk', size: '100G', bytes: 100000000000, pkname: null, pttype: 'gpt' }), children: [
        part('/dev/sda1', { size: '1G', bytes: 1000000000, fstype: 'vfat' }), part('/dev/sda2', { fstype: 'ext4' }), part('/dev/sda3'),
        part('/dev/sda4', { size: '1M', bytes: 1000000, parttype: '21686148-6449-6e6f-744e656564454649' })
    ] },
    { ...part('/dev/sdb', { type: 'disk', size: '100G', bytes: 100000000000, pkname: null, pttype: 'dos' }), children: [part('/dev/sdb1', { pkname: '/dev/sdb' }), part('/dev/sdb2', { pkname: '/dev/sdb', ro: true })] }
] };

// Emit this dispatcher as temporary regular executables; none touches a real installation target.
function nativeMock() {
    const fs = require('node:fs');
    const path = require('node:path');
    const { spawnSync } = require('node:child_process');
    const name = path.basename(process.argv[1]);
    const args = process.argv.slice(2);
    const state = JSON.parse(fs.readFileSync(process.env.TEST_STATE, 'utf8'));
    state.calls.push({ name, args, tmpdir: process.env.TMPDIR });
    fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state));
    const out = value => process.stdout.write(String(value) + '\n');
    const options = state.options;
    // Every unexpected command or argument fails instead of falling back to host utilities.
    function unexpected() { process.stderr.write('UNEXPECTED ' + name + ' ' + args.join(' ')); process.exit(99); }
    if (options.fail === name || (name === 'nix' && ((options.fail === 'nix-lock' && args.includes('lock')) || (options.fail === 'nix-release' && args.includes('--raw')) || (options.fail === 'nix-eval' && args.includes('--json')))) || (name === 'tee' && ((options.fail === 'tee-target' && args[0] === '/mnt/etc/nixos/configuration.nix') || (options.fail === 'tee-flake' && args[0] === '/mnt/etc/nixos/flake.nix')))) process.exit(2);
    if (name === 'id') { if (args.join(' ') !== '-u') unexpected(); out(options.uid ?? 0); }
    else if (name === 'cat') { if (args.join(' ') !== '/proc/meminfo') unexpected(); out(options.meminfo ?? 'MemTotal: 7812500 kB'); }
    else if (name === 'lsblk') {
        if (!['--json --paths --output NAME,TYPE,SIZE,FSTYPE,LABEL,MOUNTPOINTS,PKNAME,RO,PTTYPE,PARTTYPE,PARTUUID', '--bytes --json --paths --output NAME,TYPE,SIZE'].includes(args.join(' '))) unexpected();
        // Derive display and raw-byte inventories from the same synthetic devices.
        function convert(node) {
            const { bytes, children, ...record } = node;
            if (args.includes('--bytes')) record.size = bytes;
            if (children) record.children = children.map(convert);
            return record;
        }
        out(JSON.stringify({ blockdevices: state.inventory.blockdevices.map(convert) }));
    } else if (name === 'udevadm') {
        if (args.length !== 5 || args.slice(0, 4).join(' ') !== 'info --query=symlink --root --name' || !['/dev/sda', '/dev/sdb'].includes(args[4])) unexpected();
        out(args[4] === '/dev/sda' ? '/dev/disk/by-id/wwn-fixture-sda' : '/dev/disk/by-id/wwn-fixture-sdb');
    } else if (name === 'nixos-generate-config') {
        if (args.join(' ') === '--show-hardware-config --no-filesystems') out('# native opaque hardware\n{ ... }: {}');
        else if (args.join(' ') === '--root /mnt') {
            state.hardware = '# generated hardware and filesystems\n{ ... }: {}\n';
            fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state));
        } else unexpected();
    } else if (name === 'mktemp') {
        if (args.join(' ') !== '-d') unexpected();
        state.stage = path.join(state.dir, 'stage');
        fs.mkdirSync(state.stage);
        fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state));
        out(state.stage);
    } else if (name === 'rm') {
        if (args.length !== 3 || args[0] !== '-rf' || args[1] !== '--' || args[2] !== state.stage) unexpected();
        fs.rmSync(state.stage, { recursive: true });
        state.cleaned = true;
        fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state));
    } else if (name === 'tee') {
        const content = fs.readFileSync(0, 'utf8');
        if (args.length !== 1) unexpected();
        if (args[0] === path.join(state.stage || '', 'flake.nix')) {
            state.stageFlake = content;
            fs.writeFileSync(args[0], content);
        } else if (args[0] === '/mnt/etc/nixos/configuration.nix') state.configuration = content;
        else if (args[0] === '/mnt/etc/nixos/flake.nix') state.targetFlake = content;
        else unexpected();
        fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state));
        process.stdout.write(content);
    } else if (name === 'cp') {
        if (args.length !== 2 || args[0] !== path.join(state.stage, 'flake.lock') || args[1] !== '/mnt/etc/nixos/flake.lock') unexpected();
        state.installedLock = fs.readFileSync(args[0], 'utf8');
        fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state));
    } else if (name === 'nixos-enter') {
        if (args.length !== 4 || args.slice(0, 3).join(' ') !== '--root /mnt -c' || !/^passwd '[a-z][a-z0-9_-]*'$/.test(args[3])) unexpected();
    } else if (name === 'mkfs.ext4') {
        if (args.length !== 2 || args[0] !== '-F' || !/^\/dev\/[a-z]+[0-9]+$/.test(args[1]) || args[1] === '/dev/sda1') unexpected();
    } else if (name === 'mkdir') {
        if (args.length !== 2 || args[0] !== '-p' || !['/mnt', '/mnt/boot', '/mnt/boot/efi'].includes(args[1])) unexpected();
    } else if (name === 'mount') {
        if (args.length !== 2 || !/^\/dev\/[a-z]+[0-9]+$/.test(args[0]) || !['/mnt', '/mnt/boot', '/mnt/boot/efi'].includes(args[1])) unexpected();
    } else if (name === 'env') {
        if (args.length !== 7 || args.slice(0, 6).join(' ') !== '-u TMPDIR nixos-install --root /mnt --flake' || !/^path:\/mnt\/etc\/nixos#[a-zA-Z0-9-]+$/.test(args[6])) unexpected();
        process.exit(spawnSync(state.env, args, { stdio: 'inherit' }).status ?? 99);
    } else if (name === 'nixos-install') {
        if (args.length !== 4 || args.slice(0, 3).join(' ') !== '--root /mnt --flake' || !/^path:\/mnt\/etc\/nixos#[a-zA-Z0-9-]+$/.test(args[3]) || process.env.TMPDIR !== undefined) unexpected();
    } else if (name === 'python3') {
        if (path.resolve(args[0]) !== state.helper) unexpected();
        if (args[1] === 'probe') args.push(state.pci);
        else if (args[1] !== 'resolve' || args[2] !== state.stage) unexpected();
        process.exit(spawnSync(state.python, args, { stdio: 'inherit' }).status ?? 99);
    } else if (name === 'nix') {
        if (args.length === 5 && args.slice(0, 4).join(' ') === '--extra-experimental-features nix-command flakes flake lock' && args[4] === 'path:' + state.stage) {
            fs.writeFileSync(path.join(state.stage, 'flake.lock'), state.fakeLock);
        } else if (args.length === 10 && args.slice(0, 9).join(' ') === 'eval --extra-experimental-features nix-command flakes --option allow-import-from-derivation false --impure --raw --expr' && process.env.INSTALL_FLAKE_STAGE === state.stage) {
            if (!args[9].includes('inputs.nixpkgs.lib.trivial.release') || !args[9].includes('builtins.getFlake')) unexpected();
            out(options.pinnedRelease ?? '26.05');
        } else {
            if (args.length !== 10 || args.slice(0, 9).join(' ') !== 'eval --extra-experimental-features nix-command flakes --option allow-import-from-derivation false --impure --json --expr' || process.env.INSTALL_FLAKE_STAGE !== state.stage) unexpected();
            state.query = { expr: args[9], stage: process.env.INSTALL_FLAKE_STAGE };
            fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state));
            out(JSON.stringify(state.native));
        }
    } else if (name === 'curl') {
        if (args.length !== 9 || args.slice(0, 8).join(' ') !== '-sS -L --connect-timeout 10 --max-time 30 -w \\n%{http_code}') unexpected();
        if (args[8] === 'https://raw.githubusercontent.com/NVIDIA/nvidia-driver-assistant/main/supported-gpus/supported-gpus.json') process.stdout.write(state.vendor);
        else if (/^https:\/\/download\.nvidia\.com\/XFree86\/Linux-x86_64\/[^/]+\/README\/supportedchips\.html$/.test(args[8])) process.stdout.write(state.html);
        else unexpected();
        process.stdout.write('\n200');
    } else unexpected();
}

// All filesystem mutations are fixture files; even mkdir and the native generator are intercepted.
function run(input, args = ['--firmware', '1'], options = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'installer-test-'));
    const bin = path.join(dir, 'bin');
    const statePath = path.join(dir, 'state.json');
    try {
        fs.mkdirSync(bin);
        const pci = path.join(dir, 'pci'); fs.mkdirSync(pci);
        const gpu = path.join(pci, '0'); fs.mkdirSync(gpu);
        const gpuDevice = options.gpu?.device ?? '1c03';
        const gpuName = options.gpu?.name ?? 'GTX 1060';
        // Feed PCI identifiers to the real NVIDIA parser without reading host hardware.
        for (const [key, value] of Object.entries({ class: '0x030000', vendor: '0x10de', device: '0x' + gpuDevice, subsystem_vendor: '0x1028', subsystem_device: '0x0802' })) fs.writeFileSync(path.join(gpu, key), value + '\n');
        fs.writeFileSync(statePath, JSON.stringify({ options, calls: [], dir, fakeLock: 'FAKELOCK fixture data\n', inventory: options.inventory ?? fixture, env, python, pci, helper: path.resolve(__dirname, '../../../install-nvidia.py'),
            native: options.native ?? { system: 'x86_64-linux', candidates: [{ branch: 'stable', version: '580.178.04', open: true, broken: false }] },
            vendor: JSON.stringify({ chips: [{ devid: '0x' + gpuDevice, name: gpuName, features: options.features ?? [] }] }),
            html: `<h3>Current NVIDIA GPUs</h3><table><tr><th>NVIDIA GPU product</th><th>Device PCI ID*</th><th>VDPAU features</th></tr><tr><td>${gpuName}</td><td>${gpuDevice}</td><td>A</td></tr></table>` }));
        // A closed PATH prevents any unmocked installation command from running.
        for (const name of ['id', 'cat', 'lsblk', 'nixos-generate-config', 'tee', 'nixos-enter', 'udevadm', 'mkfs.ext4', 'mount', 'mkdir', 'nixos-install', 'env', 'python3', 'nix', 'curl', 'mktemp', 'rm', 'cp']) {
            if (name !== options.omitTool) fs.writeFileSync(path.join(bin, name), `#!${process.execPath}\n(${nativeMock.toString()})();\n`, { mode: 0o700 });
        }
        const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
        fs.writeFileSync(path.join(bin, 'jq'), `#!${bash}\nexec ${quote(jq)} "$@"\n`, { mode: 0o700 });
        const result = spawnSync(bash, ['--noprofile', '--norc', script, ...args], { input, encoding: 'utf8', timeout: 10000,
            env: { PATH: bin, HOME: dir, BASH_ENV: '/dev/null', TEST_STATE: statePath, TMPDIR: '/tmp/live-scratch' } });
        assert(!result.error, String(result.error));
        assert.doesNotMatch(result.stderr, /UNEXPECTED/);
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        return { ...result, calls: state.calls, configuration: state.configuration, hardware: state.hardware, stage: state.stage, stageFlake: state.stageFlake, targetFlake: state.targetFlake, installedLock: state.installedLock, fakeLock: state.fakeLock, cleaned: state.cleaned, query: state.query };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
module.exports = { run, fixture };
