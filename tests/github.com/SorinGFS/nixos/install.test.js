// Verify the fresh-install workflow through native-command spies, never real installation tools.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { run, fixture } = require('./install-fixture.js');
const yes = '3\n2\n1\nalice\n\nyes\n';

// Cancellation and preflight failures must never reach mutating native operations.
function untouched(result) {
    assert(!result.calls.some(call => (['mkfs.ext4', 'mount', 'mkdir', 'cp', 'nixos-install', 'nixos-enter'].includes(call.name) || (call.name === 'tee' && call.args[0].startsWith('/mnt/')))));
    assert.doesNotMatch(result.stdout, /Installation complete/);
}

// Native graphics requires no optional metadata tools and writes selected local settings.
test('fresh UEFI installation uses native commands and selected configuration', () => {
    const r = run('3\n1\n4\n1\nalice\n\nyes\n', undefined, { omitTool: 'python3' });
    assert.equal(r.status, 0, r.stderr);
    const commands = r.calls.filter(call => ['mkfs.ext4', 'mkdir', 'mount', 'nixos-generate-config', 'tee', 'env', 'nixos-install', 'nixos-enter'].includes(call.name) && !(call.name === 'tee' && call.args[0] === r.stage + '/flake.nix'));
    assert.deepEqual(commands.map(call => [call.name, ...call.args]), [
        ['nixos-generate-config', '--show-hardware-config', '--no-filesystems'],
        ['mkfs.ext4', '-F', '/dev/sda2'], ['mkfs.ext4', '-F', '/dev/sda3'],
        ['mkdir', '-p', '/mnt'], ['mount', '/dev/sda2', '/mnt'],
        ['mkdir', '-p', '/mnt/boot'], ['mount', '/dev/sda3', '/mnt/boot'],
        ['mkdir', '-p', '/mnt/boot/efi'], ['mount', '/dev/sda1', '/mnt/boot/efi'],
        ['nixos-generate-config', '--root', '/mnt'], ['tee', '/mnt/etc/nixos/configuration.nix'], ['tee', '/mnt/etc/nixos/flake.nix'],
        ['env', '-u', 'TMPDIR', 'nixos-install', '--root', '/mnt', '--flake', 'path:/mnt/etc/nixos#nixos'], ['nixos-install', '--root', '/mnt', '--flake', 'path:/mnt/etc/nixos#nixos'],
        ['nixos-enter', '--root', '/mnt', '-c', "passwd 'alice'"]
    ]);
    assert(!r.calls.some(call => ['python3', 'curl'].includes(call.name)));
    assert.equal(r.calls.filter(call => call.name === 'nix').length, 2);
    assert(r.calls.findIndex(call => call.name === 'cp') < r.calls.findIndex(call => call.name === 'nixos-install'));
    assert.equal(r.installedLock, r.fakeLock);
    assert(r.cleaned);
    for (const input of ['inputs.desktop.url = "github:SorinGFS/nixos";', 'inputs.nixpkgs.follows = "desktop/nixpkgs";']) { assert(r.stageFlake.includes(input)); assert(r.targetFlake.includes(input)); }
    assert.match(r.targetFlake, /nixosConfigurations\."nixos"/);
    assert.match(r.targetFlake, /modules = \[ \.\/configuration\.nix inputs\.desktop\.nixosModules\.default \]/);
    assert.equal(r.calls.find(call => call.name === 'nixos-install').tmpdir, undefined);
    assert.match(r.stdout, /Installation complete/);
    for (const setting of ['imports = [ ./hardware-configuration.nix ];', 'networking.hostName = "nixos";', 'networking.networkmanager.enable = true;', 'services.xserver.enable = true;', 'services.displayManager.gdm.enable = true;', 'services.desktopManager.gnome.enable = true;', 'security.sudo.enable = false;', 'users.users.alice = {', 'isNormalUser = true;', 'extraGroups = [ "wheel" "networkmanager" ];', 'system.stateVersion = "26.05";', 'boot.loader.efi.canTouchEfiVariables = true;', 'boot.loader.efi.efiSysMountPoint = "/boot/efi";', 'boot.loader.systemd-boot.enable = false;', 'boot.loader.grub = { enable = true; efiSupport = true; device = "nodev"; };']) assert(r.configuration.includes(setting), setting);
    assert.doesNotMatch(r.configuration, /nvidia|allowUnfree/);
    assert.equal(r.hardware, '# generated hardware and filesystems\n{ ... }: {}\n');
});

// Mount and bootloader settings follow the selected firmware mode.
test('systemd-boot and BIOS use their selected boot settings', () => {
    const uefi = run(yes); assert.equal(uefi.status, 0, uefi.stderr);
    assert(uefi.calls.some(call => call.name === 'mount' && call.args.join(' ') === '/dev/sda1 /mnt/boot'));
    for (const setting of ['boot.loader.efi.efiSysMountPoint = "/boot";', 'boot.loader.efi.canTouchEfiVariables = true;', 'boot.loader.systemd-boot.enable = true;', 'boot.loader.grub.enable = false;']) assert(uefi.configuration.includes(setting), setting);
    const bios = run('3\n9\n1\n1\nalice\n\nyes\n', ['--firmware', '2']);
    assert.equal(bios.status, 0, bios.stderr);
    assert.deepEqual(bios.calls.filter(call => call.name === 'mount').map(call => call.args), [['/dev/sda2', '/mnt']]);
    assert(bios.configuration.includes('boot.loader.grub = { enable = true; device = "/dev/disk/by-id/wwn-fixture-sda"; };'));
    assert(bios.configuration.includes('boot.loader.systemd-boot.enable = false;'));
    assert.doesNotMatch(bios.configuration, /boot.loader.efi/);
    const other = run('3\n9\n6\n1\nbob\nhost-2\nyes\n', ['--firmware', '2']);
    assert.equal(other.status, 0, other.stderr);
    assert(other.configuration.includes('device = "/dev/disk/by-id/wwn-fixture-sdb";'));
    assert(other.configuration.includes('users.users.bob = {'));
    assert(other.configuration.includes('networking.hostName = "host-2";'));
    assert(other.calls.some(call => call.name === 'nixos-enter' && call.args[3] === "passwd 'bob'"));
    assert(other.calls.some(call => call.name === 'nixos-install' && call.args[3] === 'path:/mnt/etc/nixos#host-2'));
    assert(other.targetFlake.includes('nixosConfigurations."host-2"'));
});

// The target release comes from pinned inputs, independently of the live image.
test('initial state version follows the pinned target release', () => {
    const r = run(yes, undefined, { pinnedRelease: '26.05' });
    assert.equal(r.status, 0, r.stderr);
    assert(r.configuration.includes('system.stateVersion = "26.05";'));
    assert(!r.calls.some(call => call.name === 'nixos-version'));
});

// Keep the original menu, identity-entry validation and one final yes/no confirmation.
test('invalid answers retry and final no or EOF cancels', () => {
    for (const input of ['', '0\n', '3\n2\n', '3\n2\n1\nalice\n\nno\n']) {
        const r = run(input); assert.equal(r.status, 0, r.stderr); untouched(r); if (r.stage) assert(r.cleaned);
    }
    const r = run('0\n3\n2\n0\n1\nroot\nalice\n$(bad)\nnode-1\nmaybe\nyes\n');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Invalid administrator name/); assert.match(r.stdout, /Invalid hostname/); assert.match(r.stdout, /Answer yes or no/);
    assert.match(r.stdout, /host=node-1\nadmin=alice/);
    assert(r.configuration.includes('networking.hostName = "node-1";'));
});

// Preserve the explicitly requested decimal RAM and root-capacity minima.
test('8 GB total RAM and 20 GB root minimums are retained', () => {
    const ram = run(yes, undefined, { meminfo: 'MemTotal: 7812499 kB' }); assert.notEqual(ram.status, 0); untouched(ram);
    const inv = structuredClone(fixture);
    inv.blockdevices[0].children[1].bytes = 19999999999;
    inv.blockdevices[0].children[2].ro = true; inv.blockdevices[1].children[0].ro = true;
    const small = run('', undefined, { inventory: inv }); assert.notEqual(small.status, 0); untouched(small);
});

// NVIDIA resolution remains opt-in and its actual branch and flavor reach the target.
test('NVIDIA option 2 writes resolved closed and open drivers', () => {
    const r = run('3\n2\n2\nalice\n\nyes\n', undefined, { native: { system: 'x86_64-linux', candidates: [{ branch: 'legacy_580', version: '580.178.04', open: true, broken: false }] } }); assert.equal(r.status, 0, r.stderr);
    assert(r.calls.some(call => call.name === 'nix')); assert(r.calls.some(call => call.name === 'curl'));
    assert.equal(r.query.stage, r.stage);
    assert(r.calls.findIndex(call => call.name === 'nix' && call.args.includes('lock')) < r.calls.findIndex(call => call.name === 'nix' && call.args.includes('--json')));
    assert.match(r.query.expr, /builtins\.getFlake/); assert.match(r.query.expr, /f\.inputs\.desktop\.nixosModules\.default/);
    assert.match(r.query.expr, /f\.inputs\.nixpkgs\.lib\.nixosSystem/); assert.doesNotMatch(r.query.expr, /<nixpkgs/);
    assert.equal(r.installedLock, r.fakeLock); assert(r.cleaned);
    assert.match(r.stdout, /module=closed/); assert.doesNotMatch(r.stdout, /Allow NVIDIA metadata queries/);
    for (const setting of ['nixpkgs.config.allowUnfree = true;', 'services.xserver.videoDrivers = [ "nvidia" ];', 'open = false;', 'branch = "legacy_580";']) assert(r.configuration.includes(setting), setting);
    const open = run('3\n2\n2\nalice\nworkstation\nyes\n', undefined, { gpu: { device: '2684', name: 'RTX 4090' }, features: ['kernelopen'], native: { system: 'x86_64-linux', candidates: [{ branch: 'stable', version: '610.12.01', open: true, broken: false }] } });
    assert.equal(open.status, 0, open.stderr);
    for (const setting of ['open = true;', 'branch = "stable";', 'networking.hostName = "workstation";']) assert(open.configuration.includes(setting), setting);
    const missing = run('3\n2\n2\n', undefined, { omitTool: 'python3' }); assert.notEqual(missing.status, 0); untouched(missing);
    const failure = run('3\n2\n2\n', undefined, { fail: 'nix-eval' }); assert.notEqual(failure.status, 0); untouched(failure); assert(failure.cleaned);
});

// Native errors abort later installation steps; no rollback or extra execution mode is invented.
test('native failures stop the workflow and unsupported flags are rejected', () => {
    for (const fail of ['nix-lock', 'nix-release', 'mkfs.ext4', 'mount', 'tee', 'tee-target', 'tee-flake', 'cp', 'nixos-install', 'nixos-enter']) {
        const r = run(yes, undefined, { fail }); assert.notEqual(r.status, 0); assert.doesNotMatch(r.stdout, /Installation complete/);
        if (r.stage) assert(r.cleaned);
        if (['nix-lock', 'nix-release', 'tee'].includes(fail)) untouched(r);
        if (!['nixos-install', 'nixos-enter'].includes(fail)) assert(!r.calls.some(call => call.name === 'nixos-install'));
        if (fail !== 'nixos-enter') assert(!r.calls.some(call => call.name === 'nixos-enter'));
    }
    const invalidVersion = run(yes, undefined, { pinnedRelease: '26.11pre123456' });
    assert.notEqual(invalidVersion.status, 0); untouched(invalidVersion);
    for (const args of [['--dry-run'], ['--execute'], ['--root', '/elsewhere']]) {
        const r = run('', args); assert.equal(r.status, 2); untouched(r);
    }
});
