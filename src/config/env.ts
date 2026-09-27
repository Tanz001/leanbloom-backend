export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT) || 3306,
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || 'leanbloom',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

export const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
