import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function main() {
  const sqlPath = path.join(__dirname, '../sql/009_subscription_plans.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'leanbloom',
    multipleStatements: true,
  });
  await conn.query(sql);
  const [plans] = await conn.query('SELECT id, name, price, is_active FROM subscription_plans');
  console.log('OK — plans:', plans);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
