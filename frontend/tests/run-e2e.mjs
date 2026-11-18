import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const directory = mkdtempSync(join(tmpdir(), 'gogo-us061-'))
const database = join(directory, 'browser.sqlite')
let result
try {
  result = spawnSync(process.execPath, [
    'node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2),
  ], {
    stdio: 'inherit',
    env: { ...process.env, GOGO_E2E_DB_PATH: database },
  })
  if (result.error) throw result.error
} finally {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try {
      unlinkSync(database + suffix)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  rmdirSync(directory)
}
if (result.signal) {
  console.error(`Playwright terminated by ${result.signal}`)
  process.exitCode = 1
} else {
  process.exitCode = result.status
}
