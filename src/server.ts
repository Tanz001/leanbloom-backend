import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { pool } from './config/db';

const PORT = env.port;

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log(`MySQL connected (${env.dbHost}/${env.dbName})`);
  } catch (err) {
    console.error('MySQL connection failed — check .env DB_* settings');
    console.error(err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`LeanBloom API running on http://localhost:${PORT}`);
    console.log(`Swagger docs:        http://localhost:${PORT}/api/docs`);
    console.log(`OpenAPI JSON:        http://localhost:${PORT}/api/docs.json`);
  });
}

start();
