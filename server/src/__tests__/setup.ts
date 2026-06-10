import * as path from 'path'
import * as dotenv from 'dotenv'

// Load root .env (server cwd is server/ when npm test runs)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

// Ensure JWT secrets exist for the test run
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-do-not-use-in-prod'
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only-do-not-use-in-prod'
}
