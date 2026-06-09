import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    // Run tests sequentially — they share a real DB and must not race
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
