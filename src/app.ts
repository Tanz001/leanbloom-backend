import path from 'path';
import express from 'express';
import cors from 'cors';
import { corsOrigins } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { setupSwagger } from './docs/swagger';
import routes from './routes';

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (Postman/curl) with no Origin
      if (!origin) {
        callback(null, true);
        return;
      }
      if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        callback(null, true);
        return;
      }
      // Dev convenience: any localhost / 127.0.0.1 port
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        callback(null, true);
        return;
      }
      // Storefront multi-tenant hosts (subdomains + common custom domains)
      if (
        /^https?:\/\/([a-z0-9-]+\.)*leanbloom\.(com|health)(:\d+)?$/i.test(
          origin
        )
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(requestLogger);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'leanbloom-api' });
});

setupSwagger(app);

app.use('/api', routes);

app.use(errorHandler);

export default app;
