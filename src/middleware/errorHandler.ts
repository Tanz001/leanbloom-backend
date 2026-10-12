import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function friendlyDbError(
  err: Error & { code?: string; sqlMessage?: string }
): { status: number; message: string } | null {
  const raw = `${err.sqlMessage || err.message || ''}`.toLowerCase();

  if (err.code === 'ER_DUP_ENTRY') {
    if (raw.includes('slug')) {
      return {
        status: 409,
        message: 'That affiliate slug is already in use. Choose a different one.',
      };
    }
    if (raw.includes('email')) {
      return {
        status: 409,
        message: 'That email is already registered. Use a different email.',
      };
    }
    if (raw.includes('domain')) {
      return {
        status: 409,
        message: 'That domain is already assigned. Use a different domain.',
      };
    }
    return {
      status: 409,
      message: 'This value is already in use. Please choose a different one.',
    };
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return {
      status: 400,
      message: 'This record is linked to other data and cannot be changed that way.',
    };
  }

  if (err.code === 'ER_DATA_TOO_LONG') {
    return {
      status: 400,
      message: 'One of the fields is too long. Please shorten it and try again.',
    };
  }

  if (err.code === 'ER_BAD_NULL_ERROR') {
    return {
      status: 400,
      message: 'A required field is missing. Please complete all required fields.',
    };
  }

  if (
    err.code === 'ER_TRUNCATED_WRONG_VALUE' ||
    err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'
  ) {
    return {
      status: 400,
      message: 'One of the values is invalid. Please check your input.',
    };
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    return {
      status: 503,
      message: 'Database is temporarily unavailable. Please try again shortly.',
    };
  }

  return null;
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
      message: err.issues[0]?.message || 'Please check your input and try again.',
      errors: err.issues,
    });
  }

  // Multer upload errors (file size / unexpected field)
  if (err.name === 'MulterError') {
    const multerErr = err as Error & { code?: string };
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image must be 10 MB or smaller' });
    }
    if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field in upload' });
    }
    return res.status(400).json({ message: 'Upload failed. Please try again with a valid image.' });
  }

  const dbFriendly = friendlyDbError(
    err as Error & { code?: string; sqlMessage?: string }
  );
  if (dbFriendly) {
    return res.status(dbFriendly.status).json({ message: dbFriendly.message });
  }

  // JWT / auth library messages → readable copy
  const jwtMsg = err.message?.toLowerCase() || '';
  if (jwtMsg.includes('jwt expired') || jwtMsg.includes('token expired')) {
    return res.status(401).json({ message: 'Your session expired. Please sign in again.' });
  }
  if (jwtMsg.includes('invalid token') || jwtMsg.includes('jwt malformed')) {
    return res.status(401).json({ message: 'Invalid session. Please sign in again.' });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError
      ? err.message
      : 'Something went wrong. Please try again.';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ message });
}
