import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Invalid JSON body
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as SyntaxError & { status?: number }).status === 400
  ) {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: err.issues[0]?.message || 'Validation failed',
      errors: err.issues,
    });
  }

  // Multer upload errors (file size / unexpected field)
  if (err.name === 'MulterError') {
    const multerErr = err as Error & { code?: string };
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image must be 5 MB or smaller' });
    }
    return res.status(400).json({ message: err.message || 'Upload failed' });
  }

  const mysqlErr = err as Error & { code?: string };
  if (mysqlErr.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Duplicate entry' });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ message });
}
