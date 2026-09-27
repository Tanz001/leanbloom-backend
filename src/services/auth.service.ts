import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { AuthUser, JwtPayload, PortalType } from '../types/auth';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { slugify, uniqueSlug } from '../utils/slug';
import { AffiliateSignupInput, LoginInput } from '../utils/validation';

type AdminRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  avatar_url: string | null;
};

type AffiliateUserRow = RowDataPacket & {
  id: string;
  affiliate_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  avatar_url: string | null;
  affiliate_name: string;
  affiliate_status: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

function toPublicAdmin(row: AdminRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    portal: 'admin',
    role: row.role,
    status: row.status,
    avatarUrl: row.avatar_url,
  };
}

function toPublicAffiliate(row: AffiliateUserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    portal: 'affiliate',
    role: row.role,
    status: row.status,
    affiliateId: row.affiliate_id,
    affiliateName: row.affiliate_name,
    affiliateStatus: row.affiliate_status,
    avatarUrl: row.avatar_url,
  };
}

function buildToken(user: AuthUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    portal: user.portal,
    role: user.role,
    affiliateId: user.affiliateId,
    affiliateName: user.affiliateName,
  };
  return signToken(payload);
}

async function loginAdmin(email: string, password: string): Promise<AuthResponse> {
  const [rows] = await pool.execute<AdminRow[]>(
    `SELECT id, name, email, password_hash, role, status, avatar_url
     FROM admin_users
     WHERE email = ?
     LIMIT 1`,
    [email.toLowerCase()]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (row.status === 'Suspended') {
    throw new AppError('Account is suspended', 403);
  }
  if (row.status !== 'Active') {
    throw new AppError('Account is not active yet', 403);
  }

  await pool.execute(
    `UPDATE admin_users SET last_login_at = NOW(3) WHERE id = ?`,
    [row.id]
  );

  const user = toPublicAdmin(row);
  return { token: buildToken(user), user };
}

async function loginAffiliate(
  email: string,
  password: string
): Promise<AuthResponse> {
  const [rows] = await pool.execute<AffiliateUserRow[]>(
    `SELECT
       u.id, u.affiliate_id, u.name, u.email, u.password_hash, u.role, u.status, u.avatar_url,
       a.name AS affiliate_name, a.status AS affiliate_status
     FROM affiliate_users u
     INNER JOIN affiliates a ON a.id = u.affiliate_id
     WHERE u.email = ?
     LIMIT 1`,
    [email.toLowerCase()]
  );

  const row = rows[0];
  if (!row) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (row.status === 'Suspended' || row.affiliate_status === 'Suspended') {
    throw new AppError('Account is suspended', 403);
  }
  if (row.status !== 'Active') {
    throw new AppError('Account is not active yet', 403);
  }
  if (row.affiliate_status === 'Inactive') {
    throw new AppError('Affiliate account is inactive', 403);
  }

  await pool.execute(
    `UPDATE affiliate_users SET last_login_at = NOW(3) WHERE id = ?`,
    [row.id]
  );

  const user = toPublicAffiliate(row);
  return { token: buildToken(user), user };
}

export const AuthService = {
  async login(input: LoginInput): Promise<AuthResponse> {
    const portal = input.portal as PortalType | undefined;

    if (portal === 'admin') {
      return loginAdmin(input.email, input.password);
    }
    if (portal === 'affiliate') {
      return loginAffiliate(input.email, input.password);
    }

    // Auto-detect: try admin first, then affiliate
    try {
      return await loginAdmin(input.email, input.password);
    } catch (adminErr) {
      if (!(adminErr instanceof AppError) || adminErr.statusCode !== 401) {
        throw adminErr;
      }
      try {
        return await loginAffiliate(input.email, input.password);
      } catch (affErr) {
        if (affErr instanceof AppError && affErr.statusCode === 401) {
          throw new AppError('Invalid email or password', 401);
        }
        throw affErr;
      }
    }
  },

  async signupAffiliate(input: AffiliateSignupInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase().trim();
    const phone = input.phone?.trim() || null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [adminEmail] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM admin_users WHERE email = ? LIMIT 1`,
        [email]
      );
      const [affEmail] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM affiliate_users WHERE email = ? LIMIT 1`,
        [email]
      );
      if (adminEmail.length || affEmail.length) {
        throw new AppError('Email is already registered', 409);
      }

      let slug = slugify(input.clinicName);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidate = uniqueSlug(slug, attempt);
        const [existing] = await conn.execute<RowDataPacket[]>(
          `SELECT id FROM affiliates WHERE slug = ? LIMIT 1`,
          [candidate]
        );
        if (!existing.length) {
          slug = candidate;
          break;
        }
        if (attempt === 19) {
          throw new AppError('Could not generate a unique affiliate slug', 500);
        }
      }

      const passwordHash = await hashPassword(input.password);

      const [affResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO affiliates
          (name, slug, contact_name, contact_email, contact_phone, status)
         VALUES (?, ?, ?, ?, ?, 'Pending')`,
        [input.clinicName.trim(), slug, input.ownerName.trim(), email, phone]
      );

      const [affRows] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM affiliates WHERE slug = ? LIMIT 1`,
        [slug]
      );
      const affiliateId = String(affRows[0].id);

      await conn.execute(
        `INSERT INTO affiliate_branding (affiliate_id, portal_title, support_email, support_phone)
         VALUES (?, ?, ?, ?)`,
        [
          affiliateId,
          `${input.clinicName.trim()} Patient Portal`,
          email,
          phone,
        ]
      );

      // Optional custom domain note stored later in domains phase;
      // keep signup focused on account creation for now.
      void input.customDomain;
      void affResult;

      await conn.execute(
        `INSERT INTO affiliate_users
          (affiliate_id, name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'owner', 'Active')`,
        [affiliateId, input.ownerName.trim(), email, passwordHash]
      );

      const [userRows] = await conn.execute<AffiliateUserRow[]>(
        `SELECT
           u.id, u.affiliate_id, u.name, u.email, u.password_hash, u.role, u.status, u.avatar_url,
           a.name AS affiliate_name, a.status AS affiliate_status
         FROM affiliate_users u
         INNER JOIN affiliates a ON a.id = u.affiliate_id
         WHERE u.email = ?
         LIMIT 1`,
        [email]
      );

      await conn.commit();

      const user = toPublicAffiliate(userRows[0]);
      return { token: buildToken(user), user };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async getMe(user: AuthUser): Promise<AuthUser> {
    if (user.portal === 'admin') {
      const [rows] = await pool.execute<AdminRow[]>(
        `SELECT id, name, email, password_hash, role, status, avatar_url
         FROM admin_users WHERE id = ? LIMIT 1`,
        [user.id]
      );
      if (!rows[0] || rows[0].status !== 'Active') {
        throw new AppError('User not found or inactive', 401);
      }
      return toPublicAdmin(rows[0]);
    }

    const [rows] = await pool.execute<AffiliateUserRow[]>(
      `SELECT
         u.id, u.affiliate_id, u.name, u.email, u.password_hash, u.role, u.status, u.avatar_url,
         a.name AS affiliate_name, a.status AS affiliate_status
       FROM affiliate_users u
       INNER JOIN affiliates a ON a.id = u.affiliate_id
       WHERE u.id = ?
       LIMIT 1`,
      [user.id]
    );

    if (!rows[0] || rows[0].status !== 'Active') {
      throw new AppError('User not found or inactive', 401);
    }
    return toPublicAffiliate(rows[0]);
  },
};
