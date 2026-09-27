import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { hashPassword } from '../utils/password';
import { slugify, uniqueSlug } from '../utils/slug';
import {
  CreateAffiliateInput,
  UpdateAffiliateInput,
} from '../utils/validation';

type AffiliateRow = RowDataPacket & {
  id: string;
  name: string;
  slug: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  status: string;
  default_markup: string | number;
  commission_rate: string | number;
  created_at: Date;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  tagline: string | null;
  portal_title: string | null;
  welcome_message: string | null;
  support_email: string | null;
  support_phone: string | null;
  hide_powered_by: number | null;
  business_hours: string | null;
  trust_badge_text: string | null;
  clinical_partner_note: string | null;
  custom_domain: string | null;
};

const SUBDOMAIN_BASE = process.env.SUBDOMAIN_BASE || 'leanbloom.com';

function mapAffiliate(row: AffiliateRow) {
  const subdomain = `${row.slug}.${SUBDOMAIN_BASE}`;
  const domain = row.custom_domain || subdomain;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    domain,
    subdomain,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone || '',
    address: row.address || undefined,
    status: row.status as 'Active' | 'Pending' | 'Inactive' | 'Suspended',
    defaultMarkup: Number(row.default_markup),
    commissionRate: Number(row.commission_rate),
    primaryColor: row.primary_color || '#173B72',
    secondaryColor: row.secondary_color || '#4FAF4A',
    logoUrl: row.logo_url || undefined,
    tagline: row.tagline || undefined,
    portalTitle: row.portal_title || undefined,
    welcomeMessage: row.welcome_message || undefined,
    supportEmail: row.support_email || undefined,
    supportPhone: row.support_phone || undefined,
    businessHours: row.business_hours || undefined,
    hidePoweredBy: Boolean(row.hide_powered_by),
    trustBadgeText: row.trust_badge_text || undefined,
    clinicalPartnerNote: row.clinical_partner_note || undefined,
    patientsCount: 0,
    ordersCount: 0,
    revenue: 0,
    commission: 0,
    growth: '+0.0%',
    createdAt: row.created_at
      ? new Date(row.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '',
  };
}

const AFFILIATE_SELECT = `
  SELECT
    a.id, a.name, a.slug, a.contact_name, a.contact_email, a.contact_phone,
    a.address, a.status, a.default_markup, a.commission_rate, a.created_at,
    b.primary_color, b.secondary_color, b.logo_url, b.tagline, b.portal_title,
    b.welcome_message, b.support_email, b.support_phone, b.hide_powered_by,
    b.business_hours, b.trust_badge_text, b.clinical_partner_note,
    (
      SELECT d.domain FROM domains d
      WHERE d.affiliate_id = a.id AND d.type = 'Custom Domain'
      ORDER BY d.is_primary DESC, d.created_at ASC
      LIMIT 1
    ) AS custom_domain
  FROM affiliates a
  LEFT JOIN affiliate_branding b ON b.affiliate_id = a.id
`;

async function resolveUniqueSlug(baseInput: string): Promise<string> {
  let base = slugify(baseInput);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = uniqueSlug(base, attempt);
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM affiliates WHERE slug = ? LIMIT 1`,
      [candidate]
    );
    if (!existing.length) return candidate;
  }
  throw new AppError('Could not generate unique slug', 500);
}

export const AffiliateService = {
  async list(status?: string) {
    let sql = `${AFFILIATE_SELECT} ORDER BY a.created_at DESC`;
    const params: string[] = [];
    if (status) {
      sql = `${AFFILIATE_SELECT} WHERE a.status = ? ORDER BY a.created_at DESC`;
      params.push(status);
    }
    const [rows] = await pool.execute<AffiliateRow[]>(sql, params);
    return rows.map(mapAffiliate);
  },

  async getById(id: string) {
    const [rows] = await pool.execute<AffiliateRow[]>(
      `${AFFILIATE_SELECT} WHERE a.id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) throw new AppError('Affiliate not found', 404);
    return mapAffiliate(rows[0]);
  },

  async create(input: CreateAffiliateInput) {
    const email = input.contactEmail.toLowerCase().trim();
    const slug = await resolveUniqueSlug(input.slug || input.name);
    const phone = input.contactPhone?.trim() || null;
    const address = input.address?.trim() || null;
    const subdomainHost = `${slug}.${SUBDOMAIN_BASE}`;

    if (!input.ownerPassword || input.ownerPassword.length < 8) {
      throw new AppError('Owner password must be at least 8 characters', 400);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [dupEmail] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM affiliate_users WHERE email = ? LIMIT 1`,
        [email]
      );
      if (dupEmail.length) {
        throw new AppError('An account with this contact email already exists', 409);
      }

      await conn.execute(
        `INSERT INTO affiliates
          (name, slug, contact_name, contact_email, contact_phone, address, status, default_markup, commission_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.name.trim(),
          slug,
          input.contactName.trim(),
          email,
          phone,
          address,
          input.status || 'Active',
          input.defaultMarkup ?? 25,
          input.commissionRate ?? 15,
        ]
      );

      const [affRows] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM affiliates WHERE slug = ? LIMIT 1`,
        [slug]
      );
      const affiliateId = String(affRows[0].id);

      await conn.execute(
        `INSERT INTO affiliate_branding
          (affiliate_id, primary_color, secondary_color, logo_url, portal_title,
           tagline, welcome_message, support_email, support_phone, hide_powered_by,
           business_hours, trust_badge_text, clinical_partner_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          affiliateId,
          input.primaryColor || '#173B72',
          input.secondaryColor || '#4FAF4A',
          input.logoUrl?.trim() || null,
          input.portalTitle?.trim() || `${input.name.trim()} Patient Portal`,
          input.tagline?.trim() || null,
          input.welcomeMessage?.trim() || null,
          input.supportEmail?.trim() || email,
          input.supportPhone?.trim() || phone,
          input.hidePoweredBy ? 1 : 0,
          input.businessHours?.trim() || null,
          input.trustBadgeText?.trim() || null,
          input.clinicalPartnerNote?.trim() || null,
        ]
      );

      await conn.execute(
        `INSERT INTO domains
          (affiliate_id, domain, type, target, status, ssl_status, is_primary, hsts_enabled)
         VALUES (?, ?, 'Platform Subdomain', ?, 'Active', 'Valid', 1, 1)`,
        [affiliateId, subdomainHost, SUBDOMAIN_BASE]
      );

      const customDomain = input.customDomain?.trim().toLowerCase();
      if (customDomain) {
        await conn.execute(
          `INSERT INTO domains
            (affiliate_id, domain, type, target, status, ssl_status, is_primary, hsts_enabled)
           VALUES (?, ?, 'Custom Domain', ?, 'Pending DNS', 'Issuing', 0, 1)`,
          [affiliateId, customDomain, 'cname.leanbloom-network.com']
        );
      }

      const passwordHash = await hashPassword(input.ownerPassword);
      await conn.execute(
        `INSERT INTO affiliate_users
          (affiliate_id, name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'owner', 'Active')`,
        [affiliateId, input.contactName.trim(), email, passwordHash]
      );

      await conn.commit();

      const affiliate = await this.getById(affiliateId);
      return { affiliate };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async update(id: string, input: UpdateAffiliateInput) {
    await this.getById(id);

    const fields: string[] = [];
    const values: unknown[] = [];

    const map: Record<string, unknown> = {
      name: input.name?.trim(),
      contact_name: input.contactName?.trim(),
      contact_email: input.contactEmail?.toLowerCase().trim(),
      contact_phone: input.contactPhone,
      address: input.address,
      status: input.status,
      default_markup: input.defaultMarkup,
      commission_rate: input.commissionRate,
    };

    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        fields.push(`${col} = ?`);
        values.push(val);
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (fields.length) {
        values.push(id);
        await conn.execute(
          `UPDATE affiliates SET ${fields.join(', ')} WHERE id = ?`,
          values as (string | number | null)[]
        );
      }

      const brandingUpdates: string[] = [];
      const brandingValues: unknown[] = [];
      if (input.primaryColor !== undefined) {
        brandingUpdates.push('primary_color = ?');
        brandingValues.push(input.primaryColor);
      }
      if (input.secondaryColor !== undefined) {
        brandingUpdates.push('secondary_color = ?');
        brandingValues.push(input.secondaryColor);
      }
      if (input.logoUrl !== undefined) {
        brandingUpdates.push('logo_url = ?');
        brandingValues.push(input.logoUrl);
      }
      if (input.portalTitle !== undefined) {
        brandingUpdates.push('portal_title = ?');
        brandingValues.push(input.portalTitle);
      }
      if (input.tagline !== undefined) {
        brandingUpdates.push('tagline = ?');
        brandingValues.push(input.tagline);
      }
      if (input.supportEmail !== undefined) {
        brandingUpdates.push('support_email = ?');
        brandingValues.push(input.supportEmail);
      }
      if (input.supportPhone !== undefined) {
        brandingUpdates.push('support_phone = ?');
        brandingValues.push(input.supportPhone);
      }
      if (input.welcomeMessage !== undefined) {
        brandingUpdates.push('welcome_message = ?');
        brandingValues.push(input.welcomeMessage);
      }
      if (input.businessHours !== undefined) {
        brandingUpdates.push('business_hours = ?');
        brandingValues.push(input.businessHours);
      }
      if (input.hidePoweredBy !== undefined) {
        brandingUpdates.push('hide_powered_by = ?');
        brandingValues.push(input.hidePoweredBy ? 1 : 0);
      }
      if (input.trustBadgeText !== undefined) {
        brandingUpdates.push('trust_badge_text = ?');
        brandingValues.push(input.trustBadgeText);
      }
      if (input.clinicalPartnerNote !== undefined) {
        brandingUpdates.push('clinical_partner_note = ?');
        brandingValues.push(input.clinicalPartnerNote);
      }

      if (brandingUpdates.length) {
        brandingValues.push(id);
        await conn.execute(
          `UPDATE affiliate_branding SET ${brandingUpdates.join(', ')} WHERE affiliate_id = ?`,
          brandingValues as (string | number | null)[]
        );
      }

      if (input.ownerPassword) {
        const passwordHash = await hashPassword(input.ownerPassword);
        await conn.execute(
          `UPDATE affiliate_users SET password_hash = ?
           WHERE affiliate_id = ? AND role = 'owner'`,
          [passwordHash, id]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return this.getById(id);
  },

  async remove(id: string) {
    await this.getById(id);
    try {
      await pool.execute(`DELETE FROM affiliates WHERE id = ?`, [id]);
    } catch (err) {
      const mysqlErr = err as Error & { code?: string };
      if (
        mysqlErr.code === 'ER_ROW_IS_REFERENCED_2' ||
        mysqlErr.code === 'ER_ROW_IS_REFERENCED'
      ) {
        throw new AppError(
          'Cannot delete this affiliate because it has patients or orders. Suspend it instead.',
          409
        );
      }
      throw err;
    }
  },
};
