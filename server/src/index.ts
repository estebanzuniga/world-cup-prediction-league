import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import app from './app'
import { registerSyncJob } from './jobs/syncResults'
import { registerKickoffReminderJob } from './jobs/kickoffReminder'
import { registerTelegramBot } from './jobs/telegramBot'

const port = process.env.PORT ?? 3000

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
  registerSyncJob()
  registerKickoffReminderJob()
  registerTelegramBot()
})
