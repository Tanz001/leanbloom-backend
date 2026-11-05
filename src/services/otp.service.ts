import { createHash, randomInt, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/password';
import { AffiliateSignupInput } from '../utils/validation';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';

type Purpose = 'signup' | 'password_reset';

type OtpRow = RowDataPacket & {
  id: string;
  email: string;
  purpose: Purpose;
  code_hash: string;
  payload_json: string | null;
  expires_at: Date;
  attempts: number;
};

function codeHash(email: string, code: string) {
  return createHash('sha256')
    .update(`${env.jwtSecret}:${email}:${code}`)
    .digest('hex');
}

async function ensureTable() {
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS email_otps (
       id CHAR(36) NOT NULL PRIMARY KEY,
       email VARCHAR(255) NOT NULL,
       purpose ENUM('signup','password_reset') NOT NULL,
       code_hash CHAR(64) NOT NULL,
       payload_json JSON NULL,
       expires_at DATETIME(3) NOT NULL,
       attempts INT NOT NULL DEFAULT 0,
       created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       KEY idx_email_purpose (email, purpose)
     )`
  );
}

async function issue(email: string, purpose: Purpose, payload?: unknown) {
  await ensureTable();
  const normalized = email.toLowerCase().trim();
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const id = randomUUID();
  await pool.execute(`DELETE FROM email_otps WHERE email = ? AND purpose = ?`, [
    normalized,
    purpose,
  ]);
  await pool.execute(
    `INSERT INTO email_otps (id, email, purpose, code_hash, payload_json, expires_at)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(3), INTERVAL 10 MINUTE))`,
    [
      id,
      normalized,
      purpose,
      codeHash(normalized, code),
      payload ? JSON.stringify(payload) : null,
    ]
  );
  await EmailService.sendOtp(normalized, code, purpose);
}

async function consume(email: string, purpose: Purpose, code: string) {
  await ensureTable();
  const normalized = email.toLowerCase().trim();
  const [rows] = await pool.execute<OtpRow[]>(
    `SELECT * FROM email_otps
     WHERE email = ? AND purpose = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalized, purpose]
  );
  const row = rows[0];
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    throw new AppError('That code is invalid or expired', 400);
  }
  if (row.attempts >= 5) {
    await pool.execute(`DELETE FROM email_otps WHERE id = ?`, [row.id]);
    throw new AppError('Too many attempts. Request a new code.', 429);
  }
  if (row.code_hash !== codeHash(normalized, code.trim())) {
    await pool.execute(
      `UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?`,
      [row.id]
    );
    throw new AppError('That code is invalid or expired', 400);
  }
  await pool.execute(`DELETE FROM email_otps WHERE id = ?`, [row.id]);
  return row;
}

async function accountExists(email: string) {
  const [admins] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM admin_users WHERE email = ? LIMIT 1`,
    [email]
  );
  const [affiliates] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM affiliate_users WHERE email = ? LIMIT 1`,
    [email]
  );
  return admins.length > 0 || affiliates.length > 0;
}

export const OtpService = {
  async requestSignupOtp(input: AffiliateSignupInput) {
    const email = input.email.toLowerCase().trim();
    if (await accountExists(email)) {
      throw new AppError('Email is already registered', 409);
    }
    const passwordHash = await hashPassword(input.password);
    await issue(email, 'signup', {
      clinicName: input.clinicName.trim(),
      ownerName: input.ownerName.trim(),
      phone: input.phone?.trim() || '',
      planId: input.planId || null,
      passwordHash,
    });
    return { message: 'Verification code sent' };
  },

  async verifySignupOtp(email: string, code: string) {
    const row = await consume(email, 'signup', code);
    const payload = row.payload_json
      ? (typeof row.payload_json === 'string'
          ? JSON.parse(row.payload_json)
          : row.payload_json)
      : null;
    if (!payload?.passwordHash || !payload.clinicName || !payload.ownerName) {
      throw new AppError('Signup details expired. Start again.', 400);
    }
    return AuthService.signupAffiliate(
      {
        clinicName: payload.clinicName,
        ownerName: payload.ownerName,
        email: row.email,
        phone: payload.phone || '',
        password: 'verified-via-otp',
        planId: payload.planId || undefined,
      },
      payload.passwordHash
    );
  },

  async requestPasswordOtp(email: string) {
    const normalized = email.toLowerCase().trim();
    if (await accountExists(normalized)) {
      await issue(normalized, 'password_reset');
    }
    return {
      message: 'If an account exists for that email, a verification code is on its way.',
    };
  },

  async verifyPasswordOtp(email: string, code: string) {
    await consume(email, 'password_reset', code);
    const resetToken = jwt.sign(
      { purpose: 'password_reset', email: email.toLowerCase().trim() },
      env.jwtSecret,
      { expiresIn: '15m' }
    );
    return { message: 'Code verified', resetToken };
  },

  async resetPassword(resetToken: string, newPassword: string) {
    let email = '';
    try {
      const decoded = jwt.verify(resetToken, env.jwtSecret) as {
        purpose?: string;
        email?: string;
      };
      if (decoded.purpose !== 'password_reset' || !decoded.email) {
        throw new Error('invalid');
      }
      email = decoded.email.toLowerCase().trim();
    } catch {
      throw new AppError('Reset session expired. Request a new code.', 400);
    }

    const passwordHash = await hashPassword(newPassword);
    const [aff] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM affiliate_users WHERE email = ? LIMIT 1`,
      [email]
    );
    const [admin] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM admin_users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (!aff.length && !admin.length) {
      throw new AppError('Account not found', 404);
    }
    if (aff.length) {
      await pool.execute(
        `UPDATE affiliate_users SET password_hash = ? WHERE email = ?`,
        [passwordHash, email]
      );
    }
    if (admin.length) {
      await pool.execute(
        `UPDATE admin_users SET password_hash = ? WHERE email = ?`,
        [passwordHash, email]
      );
    }
    return { message: 'Password updated. You can sign in now.' };
  },
};
