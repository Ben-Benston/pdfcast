/**
 * Run SQL migrations against Neon Postgres.
 * Usage: npm run db:migrate
 * or: DATABASE_URL="postgres://..." node scripts/migrate.mjs
 */
import 'dotenv/config'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

neonConfig.webSocketConstructor = ws

const __dir = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dir, '../migrations')

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not defined.')
  console.error('Please configure DATABASE_URL in your .env file or environment.')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

try {
  const client = await pool.connect()
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  console.log(`Found ${files.length} migration(s)...\n`)

  for (const file of files) {
    const filePath = join(migrationsDir, file)
    const content = readFileSync(filePath, 'utf8')
    console.log(`Running migration: ${file}...`)
    await client.query(content)
    console.log(`  ✓ ${file} applied successfully`)
  }

  client.release()
  await pool.end()
  console.log('\nAll migrations completed successfully.')
} catch (err) {
  console.error('Migration failed:', err)
  process.exit(1)
}
