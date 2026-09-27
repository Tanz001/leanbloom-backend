import mysql from 'mysql2/promise';
import { env } from './env';

export const pool = mysql.createPool({
  host: env.dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export async function query<T = unknown>(sql: string, params?: unknown) {
  const [rows] = await pool.execute(sql, params as never);
  return rows as T;
}
