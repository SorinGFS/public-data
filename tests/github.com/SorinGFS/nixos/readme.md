# Installer and desktop application tests

Run from the repository root:

```bash
bash -n install.sh
node --check '#/public/tests/install-fixture.js'
node --check '#/public/tests/install.test.js'
node --test '#/public/tests/install.test.js'
```

The tests require Node.js, Bash, jq, coreutils `env`, and Python 3 for the optional NVIDIA resolver case.

The test workflow runs `install.sh` with a closed mock-only `PATH`. Mock commands cover staging and lock creation, cleanup, formatting, mounting, directory creation, native configuration generation, target configuration writing, lock copying, password setup, package installation, and hardware/network queries. Fixture files are kept in a temporary directory, and the tests exercise controlled data through jq, Bash, `env -u TMPDIR`, and the Python resolver process.

Coverage includes UEFI/BIOS operation order and configuration, ESP and generated hardware preservation, selected identity and release, kernel/Mesa graphics, cancellation, input validation, RAM and root minimums, resolved NVIDIA branch and flavor, and native command failures.

Scope: the mocked workflow and its recorded command behavior. Real Nix evaluation, installation, and activation are not exercised.

## Desktop application

Run from the repository root:

```bash
bash -n app.sh
node --check '#/public/tests/apply.test.js'
node --test '#/public/tests/apply.test.js'
```

These tests use Node.js, Bash and the application's coreutils, diffutils and `flock` commands. They run the application script with fixture-only paths and a closed `PATH`: Nix and `nixos-rebuild` are spies, and root identity and ownership are mocked. No real machine configuration, locks, builds or activation are touched.

Coverage includes first application, repeated updates, unchanged machine files with or without an unrelated flake, generated-source correspondence, state object and permission checks, platform and argument validation, and failures at the update and rebuild stages. When `nix-instantiate` is available, generated flakes are checked with `--parse` only. App packaging, evaluation and activation require a separately authorized real NixOS test.
