import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const database = process.env.GOGO_E2E_DB_PATH
if (!database) throw new Error('Run browser tests through npm run test:e2e to create an isolated database')

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:15173',
    ...devices['Desktop Chrome'],
    ...(process.env.GOGO_E2E_BROWSER_CHANNEL
      ? { channel: process.env.GOGO_E2E_BROWSER_CHANNEL }
      : {}),
  },
  webServer: [
    {
      command: 'mvn -B -f ../backend/pom.xml spring-boot:run',
      url: 'http://127.0.0.1:18080/api/greeting',
      env: {
        SERVER_PORT: '18080',
        SPRING_DATASOURCE_URL: `jdbc:sqlite:${database}`,
        SPRING_SQL_INIT_MODE: 'always',
        SPRING_SQL_INIT_DATA_LOCATIONS: [
          pathToFileURL(resolve('tests/fixtures/dashboard.sql')).href,
          pathToFileURL(resolve('tests/fixtures/split-route-edit.sql')).href,
        ].join(','),
      },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 15173 --strictPort',
      url: 'http://127.0.0.1:15173/',
      env: { GOGO_API_PROXY_TARGET: 'http://127.0.0.1:18080' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
