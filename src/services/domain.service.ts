import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import {
  CreateDomainInput,
  UpdateDomainInput,
} from '../utils/validation';

const SUBDOMAIN_BASE = process.env.SUBDOMAIN_BASE || 'leanbloom.com';
const CNAME_TARGET =
  process.env.STOREFRONT_CNAME_TARGET || 'cname.leanbloom-network.com';

type DomainRow = RowDataPacket & {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  domain: string;
  type: string;
  target: string;
  status: string;
  ssl_status: string;
  ssl_expiry: Date | string | null;
  is_primary: number;
  hsts_enabled: number;
  edge_latency_ms: number | null;
  last_verified_at: Date | string | null;
  created_at: Date | string;
};

type DnsRow = RowDataPacket & {
  id: string;
  domain_id: string;
  type: string;
  host: string;
  value: string;
  status: string;
  ttl: string;
};

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function mapDomain(row: DomainRow, dnsRecords: DnsRow[] = []) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    affiliateName: row.affiliate_name,
    domain: row.domain,
    type: row.type as 'Custom Domain' | 'Platform Subdomain',
    target: row.target,
    status: row.status as
      | 'Active'
      | 'Pending DNS'
      | 'SSL Generating'
      | 'Configuration Error',
    sslStatus: row.ssl_status as
      | 'Valid'
      | 'Issuing'
      | 'Expiring Soon'
      | 'Failed',
    sslExpiry: formatDate(row.ssl_expiry),
    primary: Boolean(row.is_primary),
    hstsEnabled: Boolean(row.hsts_enabled),
    createdAt: formatDate(row.created_at),
    lastVerified: row.last_verified_at
      ? formatDate(row.last_verified_at)
      : 'Never',
    edgeLatencyMs: row.edge_latency_ms ?? undefined,
    dnsRecords: dnsRecords.map((r) => ({
      type: r.type as 'CNAME' | 'A' | 'TXT',
      host: r.host,
      value: r.value,
      status: r.status as 'Verified' | 'Pending' | 'Error',
      ttl: r.ttl,
    })),
  };
}

const DOMAIN_SELECT = `
  SELECT
    d.id, d.affiliate_id, d.domain, d.type, d.target, d.status,
    d.ssl_status, d.ssl_expiry, d.is_primary, d.hsts_enabled,
    d.edge_latency_ms, d.last_verified_at, d.created_at,
    a.name AS affiliate_name
  FROM domains d
  INNER JOIN affiliates a ON a.id = d.affiliate_id
`;

async function loadDns(domainIds: string[]): Promise<Map<string, DnsRow[]>> {
  const map = new Map<string, DnsRow[]>();
  if (!domainIds.length) return map;
  const placeholders = domainIds.map(() => '?').join(',');
  const [rows] = await pool.execute<DnsRow[]>(
    `SELECT id, domain_id, type, host, value, status, ttl
     FROM dns_records
     WHERE domain_id IN (${placeholders})
     ORDER BY created_at ASC`,
    domainIds
  );
  for (const row of rows) {
    const list = map.get(row.domain_id) || [];
    list.push(row);
    map.set(row.domain_id, list);
  }
  return map;
}

function buildDnsRecords(domain: string, target: string, affiliateSlug: string) {
  const parts = domain.split('.');
  const host = parts.length > 2 ? parts[0] : '@';
  const challengeToken = `lb-auth-${affiliateSlug.slice(0, 4)}-${Math.floor(
    10000000 + Math.random() * 90000000
  )}-verify`;
  return [
    {
      type: 'CNAME' as const,
      host,
      value: target,
      status: 'Pending' as const,
      ttl: '300',
    },
    {
      type: 'TXT' as const,
      host:
        host === '@'
          ? '_leanbloom-challenge'
          : `_leanbloom-challenge.${host}`,
      value: challengeToken,
      status: 'Pending' as const,
      ttl: '300',
    },
  ];
}

export const DomainService = {
  async list() {
    const [rows] = await pool.execute<DomainRow[]>(
      `${DOMAIN_SELECT} ORDER BY d.created_at DESC`
    );
    const dnsMap = await loadDns(rows.map((r) => r.id));
    return rows.map((r) => mapDomain(r, dnsMap.get(r.id) || []));
  },

  async getById(id: string) {
    const [rows] = await pool.execute<DomainRow[]>(
      `${DOMAIN_SELECT} WHERE d.id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) throw new AppError('Domain not found', 404);
    const dnsMap = await loadDns([id]);
    return mapDomain(rows[0], dnsMap.get(id) || []);
  },

  async create(input: CreateDomainInput) {
    const domain = input.domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    const type = input.type || 'Custom Domain';
    const target =
      input.target?.trim() ||
      (type === 'Platform Subdomain' ? SUBDOMAIN_BASE : CNAME_TARGET);

    const [affRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, slug FROM affiliates WHERE id = ? LIMIT 1`,
      [input.affiliateId]
    );
    if (!affRows[0]) throw new AppError('Affiliate not found', 404);

    const [dup] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM domains WHERE domain = ? LIMIT 1`,
      [domain]
    );
    if (dup.length) throw new AppError('Domain already registered', 409);

    const isPrimary = input.isPrimary !== false;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (isPrimary) {
        await conn.execute(
          `UPDATE domains SET is_primary = 0 WHERE affiliate_id = ?`,
          [input.affiliateId]
        );
      }

      await conn.execute(
        `INSERT INTO domains
          (affiliate_id, domain, type, target, status, ssl_status, is_primary, hsts_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          input.affiliateId,
          domain,
          type,
          target,
          type === 'Platform Subdomain' ? 'Active' : 'Pending DNS',
          type === 'Platform Subdomain' ? 'Valid' : 'Issuing',
          isPrimary ? 1 : 0,
        ]
      );

      const [created] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM domains WHERE domain = ? LIMIT 1`,
        [domain]
      );
      const domainId = String(created[0].id);

      if (type === 'Custom Domain') {
        const records = buildDnsRecords(
          domain,
          target,
          String(affRows[0].slug)
        );
        for (const rec of records) {
          await conn.execute(
            `INSERT INTO dns_records (domain_id, type, host, value, status, ttl)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [domainId, rec.type, rec.host, rec.value, rec.status, rec.ttl]
          );
        }
      }

      await conn.commit();
      return this.getById(domainId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async update(id: string, input: UpdateDomainInput) {
    await this.getById(id);
    const [rows] = await pool.execute<DomainRow[]>(
      `${DOMAIN_SELECT} WHERE d.id = ? LIMIT 1`,
      [id]
    );
    const row = rows[0];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (input.isPrimary === true) {
        await conn.execute(
          `UPDATE domains SET is_primary = 0 WHERE affiliate_id = ?`,
          [row.affiliate_id]
        );
        await conn.execute(
          `UPDATE domains SET is_primary = 1 WHERE id = ?`,
          [id]
        );
      } else if (input.isPrimary === false) {
        await conn.execute(
          `UPDATE domains SET is_primary = 0 WHERE id = ?`,
          [id]
        );
      }

      if (input.status !== undefined) {
        await conn.execute(`UPDATE domains SET status = ? WHERE id = ?`, [
          input.status,
          id,
        ]);
      }
      if (input.hstsEnabled !== undefined) {
        await conn.execute(
          `UPDATE domains SET hsts_enabled = ? WHERE id = ?`,
          [input.hstsEnabled ? 1 : 0, id]
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

  async verify(id: string) {
    await this.getById(id);
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);

    await pool.execute(
      `UPDATE domains
       SET status = 'Active',
           ssl_status = 'Valid',
           ssl_expiry = ?,
           last_verified_at = NOW(3),
           edge_latency_ms = ?
       WHERE id = ?`,
      [expiry.toISOString().slice(0, 10), 18 + Math.floor(Math.random() * 40), id]
    );
    await pool.execute(
      `UPDATE dns_records SET status = 'Verified' WHERE domain_id = ?`,
      [id]
    );
    return this.getById(id);
  },

  async remove(id: string) {
    const domain = await this.getById(id);
    if (domain.type === 'Platform Subdomain') {
      throw new AppError('Platform subdomains cannot be deleted', 400);
    }
    await pool.execute(`DELETE FROM domains WHERE id = ?`, [id]);
  },
};
