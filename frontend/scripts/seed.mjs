// Gives the demo accounts REAL bcrypt password hashes.
//
// sql/02_sample_data.sql and sql/10_extra_sample_data.sql insert placeholder
// hashes (they start with "$2b$12$abcdefghijklmnopqrstuv"), because a hash
// cannot be written by hand. Run this once after loading the SQL:
//
//     npm run seed
//
// Only users that still have a placeholder are changed, so it is safe to re-run
// and it never touches real accounts (for example customers who registered).
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const password = process.env.DEMO_PASSWORD || 'Admin123';
const PLACEHOLDER = '$2b$12$abcdefghijklmnopqrstuv%';

for (const name of ['DB_HOST', 'DB_USER', 'DB_NAME']) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Create frontend/.env.local from .env.example first.`);
    process.exit(1);
  }
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME,
});

try {
  const [users] = await conn.query('SELECT user_id, email FROM users WHERE password_hash LIKE ?', [PLACEHOLDER]);
  if (users.length === 0) {
    console.log('Nothing to do: every user already has a real password hash.');
  } else {
    const hash = await bcrypt.hash(password, 10);
    for (const u of users) {
      await conn.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, u.user_id]);
      console.log(`  password set for ${u.email}`);
    }
    console.log(`\nDone. ${users.length} account(s) can now sign in with the password "${password}".`);
  }
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
