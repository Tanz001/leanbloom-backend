import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { StorefrontCheckoutInput } from '../utils/validation';

const SUBDOMAIN_BASE = process.env.SUBDOMAIN_BASE || 'leanbloom.com';

type TenantRow = RowDataPacket & {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  status: string;
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

function mapTenant(row: TenantRow) {
  const subdomain = `${row.slug}.${SUBDOMAIN_BASE}`;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    subdomain,
    customDomain: row.custom_domain || '',
    logoUrl: row.logo_url || undefined,
    primaryColor: row.primary_color || '#173B72',
    secondaryColor: row.secondary_color || '#4FAF4A',
    businessName: row.portal_title || row.name,
    tagline: row.tagline || '',
    welcomeMessage: row.welcome_message || '',
    supportEmail: row.support_email || '',
    supportPhone: row.support_phone || '',
    hidePoweredBy: Boolean(row.hide_powered_by),
    clinicAddress: row.address || undefined,
    businessHours: row.business_hours || undefined,
    clinicalPartnerNote: row.clinical_partner_note || undefined,
    trustBadgeText: row.trust_badge_text || undefined,
  };
}

const TENANT_SELECT = `
  SELECT
    a.id, a.name, a.slug, a.address, a.status,
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

function resolveHostMatch(host: string, row: TenantRow): boolean {
  const clean = host.toLowerCase().replace(/^www\./, '').trim();
  if (!clean) return false;
  const subdomain = `${row.slug}.${SUBDOMAIN_BASE}`.toLowerCase();
  const custom = (row.custom_domain || '').toLowerCase();
  if (clean === subdomain || (custom && clean === custom)) return true;
  if (clean.startsWith(`${row.slug.toLowerCase()}.`)) return true;
  return false;
}

export const StorefrontService = {
  async listTenants() {
    const [rows] = await pool.execute<TenantRow[]>(
      `${TENANT_SELECT} WHERE a.status = 'Active' ORDER BY a.name ASC`
    );
    return rows.map(mapTenant);
  },

  async resolveTenant(opts: { host?: string; slug?: string; id?: string }) {
    if (opts.id) {
      const [rows] = await pool.execute<TenantRow[]>(
        `${TENANT_SELECT} WHERE a.id = ? AND a.status = 'Active' LIMIT 1`,
        [opts.id]
      );
      if (!rows[0]) throw new AppError('Storefront not found', 404);
      return mapTenant(rows[0]);
    }

    if (opts.slug) {
      const [rows] = await pool.execute<TenantRow[]>(
        `${TENANT_SELECT} WHERE a.slug = ? AND a.status = 'Active' LIMIT 1`,
        [opts.slug.toLowerCase().trim()]
      );
      if (!rows[0]) throw new AppError('Storefront not found', 404);
      return mapTenant(rows[0]);
    }

    if (opts.host) {
      const [rows] = await pool.execute<TenantRow[]>(
        `${TENANT_SELECT} WHERE a.status = 'Active'`
      );
      const match = rows.find((r) => resolveHostMatch(opts.host!, r));
      if (!match) throw new AppError('Storefront not found for this host', 404);
      return mapTenant(match);
    }

    throw new AppError('Provide host, slug, or id', 400);
  },

  async listProducts(affiliateId: string) {
    const tenant = await this.resolveTenant({ id: affiliateId });

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         p.id, p.name, p.category, p.description, p.image_url,
         p.base_price, p.minimum_price, p.stock_status,
         app.selling_price, app.is_active AS price_active,
         a.default_markup
       FROM products p
       CROSS JOIN affiliates a
       LEFT JOIN affiliate_product_prices app
         ON app.product_id = p.id AND app.affiliate_id = a.id
       WHERE a.id = ? AND p.status = 'Active'
       ORDER BY p.name ASC`,
      [affiliateId]
    );

    return {
      tenant,
      products: rows.map((r) => {
        const basePrice = Number(r.base_price);
        const minimumPrice = Number(r.minimum_price);
        const markup = Number(r.default_markup) || 0;
        const suggested =
          Math.round(basePrice * (1 + markup / 100) * 100) / 100;
        const selling =
          r.selling_price != null && Number(r.price_active) === 1
            ? Number(r.selling_price)
            : Math.max(suggested, minimumPrice);

        return {
          id: r.id,
          name: r.name,
          category: r.category as string,
          description: r.description || '',
          imageUrl: r.image_url || null,
          price: selling,
          basePrice,
          minimumPrice,
          stockStatus: r.stock_status as string,
        };
      }),
    };
  },

  async checkout(input: StorefrontCheckoutInput) {
    const [affRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, status, commission_rate FROM affiliates WHERE id = ? LIMIT 1`,
      [input.affiliateId]
    );
    if (!affRows[0]) throw new AppError('Affiliate not found', 404);
    if (affRows[0].status !== 'Active') {
      throw new AppError('This storefront is not accepting orders', 400);
    }

    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const placeholders = productIds.map(() => '?').join(',');
    const [productRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         p.id, p.name, p.base_price, p.minimum_price, p.status,
         app.selling_price, app.is_active AS price_active,
         a.default_markup
       FROM products p
       CROSS JOIN affiliates a
       LEFT JOIN affiliate_product_prices app
         ON app.product_id = p.id AND app.affiliate_id = a.id
       WHERE a.id = ? AND p.id IN (${placeholders})`,
      [input.affiliateId, ...productIds]
    );

    const byId = new Map(productRows.map((r) => [r.id as string, r]));
    const lineItems: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[] = [];

    for (const item of input.items) {
      const p = byId.get(item.productId);
      if (!p || p.status !== 'Active') {
        throw new AppError(`Product unavailable: ${item.productId}`, 400);
      }
      const basePrice = Number(p.base_price);
      const minimumPrice = Number(p.minimum_price);
      const markup = Number(p.default_markup) || 0;
      const suggested =
        Math.round(basePrice * (1 + markup / 100) * 100) / 100;
      const unitPrice =
        p.selling_price != null && Number(p.price_active) === 1
          ? Number(p.selling_price)
          : Math.max(suggested, minimumPrice);
      if (unitPrice < minimumPrice) {
        throw new AppError(
          `Price for ${p.name} is below the platform minimum`,
          400
        );
      }
      lineItems.push({
        productId: p.id,
        productName: p.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
      });
    }

    const email = input.email.toLowerCase().trim();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existing] = await conn.execute<RowDataPacket[]>(
        `SELECT id FROM patients WHERE affiliate_id = ? AND email = ? LIMIT 1`,
        [input.affiliateId, email]
      );

      let patientId: string;
      if (existing[0]) {
        patientId = existing[0].id as string;
        await conn.execute(
          `UPDATE patients
           SET name = ?, phone = ?, status = 'Pending Intake',
               active_program = ?, last_activity_at = NOW(3)
           WHERE id = ?`,
          [
            input.fullName.trim(),
            input.phone?.trim() || null,
            lineItems[0]?.productName || null,
            patientId,
          ]
        );
      } else {
        patientId = randomUUID();
        await conn.execute(
          `INSERT INTO patients
            (id, affiliate_id, name, email, phone, status, active_program, last_activity_at)
           VALUES (?, ?, ?, ?, ?, 'Pending Intake', ?, NOW(3))`,
          [
            patientId,
            input.affiliateId,
            input.fullName.trim(),
            email,
            input.phone?.trim() || null,
            lineItems[0]?.productName || null,
          ]
        );
      }

      const orderIds: string[] = [];
      const orderNumbers: string[] = [];
      let grandTotal = 0;

      for (const line of lineItems) {
        for (let q = 0; q < line.quantity; q++) {
          const orderId = randomUUID();
          const orderNumber = `LB-${Date.now().toString(36).toUpperCase()}-${Math.floor(
            Math.random() * 900 + 100
          )}`;
          await conn.execute(
            `INSERT INTO orders
              (id, order_number, patient_id, affiliate_id, product_id, product_name,
               amount, status, payment_method, shipping_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 'Card (pending review)', 'Pending Lab')`,
            [
              orderId,
              orderNumber,
              patientId,
              input.affiliateId,
              line.productId,
              line.productName,
              line.unitPrice,
            ]
          );
          orderIds.push(orderId);
          orderNumbers.push(orderNumber);
          grandTotal += line.unitPrice;
        }
      }

      await conn.commit();

      const shipping = input.shippingAddress;
      const shippingStr = shipping
        ? [
            shipping.addressLine1,
            shipping.addressLine2,
            [shipping.city, shipping.state, shipping.zipCode]
              .filter(Boolean)
              .join(', '),
          ]
            .filter(Boolean)
            .join(', ')
        : '';

      return {
        patientId,
        orderIds,
        orderNumbers,
        primaryOrderNumber: orderNumbers[0],
        total: Math.round(grandTotal * 100) / 100,
        items: lineItems,
        affiliateName: affRows[0].name as string,
        patient: {
          fullName: input.fullName.trim(),
          email,
          phone: input.phone?.trim() || '',
          state: input.state || shipping?.state || '',
          shippingAddress: shippingStr,
        },
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};
