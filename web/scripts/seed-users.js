// Run from the web/ directory: node scripts/seed-users.js
// Requires: users table already created (run supabase/users.sql first)

const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const env = fs.readFileSync(envPath, 'utf8')
const getEnv = (key) => {
  const match = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

const USERS = [
  { username: 'Admin',          display_name: 'Administrator',  role: 'Admin',           password: 'Admin123' },
  { username: 'Shareholder',    display_name: 'Shareholder',    role: 'Shareholder',     password: 'Shareholder123' },
  { username: 'GeneralManager', display_name: 'General Manager',role: 'General Manager', password: 'GeneralManager123' },
  { username: 'Accountant',     display_name: 'Accountant',     role: 'Accountant',      password: 'Accountant123' },
  { username: 'Lawyer',         display_name: 'Lawyer',         role: 'Lawyer',          password: 'Lawyer123' },
  { username: 'Staff',          display_name: 'Staff',          role: 'Staff',           password: 'Staff123' },
]

async function main() {
  console.log('Hashing passwords and inserting users...\n')

  for (const u of USERS) {
    const password_hash = await bcrypt.hash(u.password, 10)
    const { error } = await supabase
      .from('users')
      .upsert({ username: u.username, display_name: u.display_name, role: u.role, password_hash }, { onConflict: 'username' })

    if (error) {
      console.error(`  FAILED  ${u.username}: ${error.message}`)
    } else {
      console.log(`  OK      ${u.username} (${u.role})`)
    }
  }

  console.log('\nDone. Users are ready to log in.')
}

main().catch(console.error)
