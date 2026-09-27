import { NextFunction, Request, Response } from 'express';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'authorization',
  'jwt',
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = redact(val);
      }
    }
    return out;
  }
  return value;
}

function safeJson(value: unknown, maxLen = 4000): string {
  try {
    const str = JSON.stringify(redact(value), null, 2);
    if (str.length > maxLen) {
      return `${str.slice(0, maxLen)}… [truncated]`;
    }
    return str;
  } catch {
    return String(value);
  }
}

/**
 * Logs method, URL, query, body, status, and response body for every request.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  const chunks: Buffer[] = [];

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  let responseBody: unknown;

  res.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as Response['json'];

  res.send = ((body?: unknown) => {
    if (responseBody === undefined && body !== undefined) {
      if (Buffer.isBuffer(body)) {
        chunks.push(body);
        responseBody = body.toString('utf8');
      } else if (typeof body === 'string') {
        try {
          responseBody = JSON.parse(body);
        } catch {
          responseBody = body;
        }
      } else {
        responseBody = body;
      }
    }
    return originalSend(body as never);
  }) as Response['send'];

  res.on('finish', () => {
    const ms = Date.now() - started;
    const line = '─'.repeat(56);

    console.log(`\n${line}`);
    console.log(`[API] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
    console.log(`[API] IP: ${req.ip || req.socket.remoteAddress || 'unknown'}`);

    if (req.query && Object.keys(req.query).length > 0) {
      console.log(`[API] Query:\n${safeJson(req.query)}`);
    }

    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      console.log(`[API] Body:\n${safeJson(req.body)}`);
    }

    if (responseBody !== undefined) {
      console.log(`[API] Response:\n${safeJson(responseBody)}`);
    } else if (chunks.length) {
      console.log(`[API] Response:\n${safeJson(Buffer.concat(chunks).toString('utf8'))}`);
    }
    console.log(`${line}\n`);
  });

  next();
}
