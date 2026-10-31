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
  paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  paypalMode: (process.env.PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live',
  /** When true (or keys missing in development), payments can be mock-captured */
  paypalMock:
    process.env.PAYPAL_MOCK === 'true' ||
    (!process.env.PAYPAL_CLIENT_ID && process.env.NODE_ENV !== 'production'),
  appPublicUrl:
    process.env.APP_PUBLIC_URL || 'http://localhost:5173',
};

export const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
