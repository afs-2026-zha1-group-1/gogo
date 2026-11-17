import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const lockfile = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));

test('native packages for non-Linux platforms have no Linux libc constraint', () => {
  const invalid = Object.entries(lockfile.packages)
    .filter(([, pkg]) => pkg.libc && pkg.os && !pkg.os.includes('linux'))
    .map(([name]) => name);

  assert.deepEqual(invalid, []);
});

test('the lockfile includes the Windows x64 rolldown binding', () => {
  const binding = lockfile.packages['node_modules/@rolldown/binding-win32-x64-msvc'];
  assert.ok(binding);
  assert.ok(binding.os.includes('win32'));
  assert.ok(binding.cpu.includes('x64'));
});

test('the lockfile does not reference the internal registry', () => {
  const internal = Object.entries(lockfile.packages)
    .filter(([, pkg]) => pkg.resolved && new URL(pkg.resolved).hostname === 'artifact.oocl.com')
    .map(([name]) => name);

  assert.deepEqual(internal, []);
});
