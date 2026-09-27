import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import {
  CreateAffiliatePatientInput,
  SetAffiliatePriceInput,
} from '../utils/validation';

const SUBDOMAIN_BASE = process.env.SUBDOMAIN_BASE || 'leanbloom.com';

type AffRow = RowDataPacket & {
  id: string;
  name: string;
  slug: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  status: string;
  commission_rate: string | number;
  default_markup: string | number;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  portal_title: string | null;
  support_email: string | null;
  support_phone: string | null;
  custom_domain: string | null;
};

function mapProfile(row: AffRow) {
  const subdomain = `${row.slug}.${SUBDOMAIN_BASE}`;
  const domain = row.custom_domain || subdomain;
  return {
    id: row.id,
    name: row.name,
    tradingName: row.portal_title || row.name,
    email: row.contact_email,
    phone: row.contact_phone || '',
    website: `https://${domain}`,
    businessName: row.name,
    businessEmail: row.support_email || row.contact_email,
    businessPhone: row.support_phone || row.contact_phone || '',
    businessAddress: row.address || '',
    country: 'United States',
    commissionRate: Number(row.commission_rate),
    defaultMarkup: Number(row.default_markup),
    status: (row.status === 'Suspended' || row.status === 'Inactive'
      ? row.status === 'Suspended'
        ? 'Suspended'
        : 'Suspended'
      : row.status === 'Pending'
        ? 'Pending'
        : 'Active') as 'Active' | 'Pending' | 'Suspended',
    primaryColor: row.primary_color || '#173B72',
    secondaryColor: row.secondary_color || '#4FAF4A',
    logoUrl: row.logo_url || null,
    subdomain,
    domain,
    payoutMethod: 'Bank Transfer' as const,
    bankName: '',
    routingNumberMasked: '',
    accountNumberMasked: '',
    accountHolderName: row.name,
    paypalEmailMasked: '',
    notificationPreferences: {
      newOrders: true,
      commissions: true,
      payments: true,
      weeklySummary: true,
      marketing: false,
    },
    twoFactorEnabled: false,
    lastLoginIp: '',
    lastLoginTime: '',
  };
}

export const AffiliatePortalService = {
  async getProfile(affiliateId: string) {
    const [rows] = await pool.execute<AffRow[]>(
      `SELECT
         a.id, a.name, a.slug, a.contact_name, a.contact_email, a.contact_phone,
         a.address, a.status, a.commission_rate, a.default_markup,
         b.primary_color, b.secondary_color, b.logo_url, b.portal_title,
         b.support_email, b.support_phone,
         (
           SELECT d.domain FROM domains d
           WHERE d.affiliate_id = a.id AND d.type = 'Custom Domain'
           ORDER BY d.is_primary DESC, d.created_at ASC LIMIT 1
         ) AS custom_domain
       FROM affiliates a
       LEFT JOIN affiliate_branding b ON b.affiliate_id = a.id
       WHERE a.id = ?
       LIMIT 1`,
      [affiliateId]
    );
    if (!rows[0]) throw new AppError('Affiliate not found', 404);
    return mapProfile(rows[0]);
  },

  async getDashboard(affiliateId: string) {
    const [[patientCount]] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM patients WHERE affiliate_id = ?`,
      [affiliateId]
    );
    const [[orderStats]] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS orders_count,
         COALESCE(SUM(CASE WHEN status NOT IN ('Cancelled','Refunded') THEN amount ELSE 0 END), 0) AS revenue
       FROM orders WHERE affiliate_id = ?`,
      [affiliateId]
    );
    const [[pendingCommission]] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount_payable), 0) AS pending
       FROM commission_records
       WHERE affiliate_id = ? AND payment_status = 'Pending'`,
      [affiliateId]
    );

    const [salesRows] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(ordered_at) AS day,
              COUNT(*) AS orders,
              COALESCE(SUM(CASE WHEN status NOT IN ('Cancelled','Refunded') THEN amount ELSE 0 END), 0) AS revenue
       FROM orders
       WHERE affiliate_id = ? AND ordered_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(ordered_at)
       ORDER BY day ASC`,
      [affiliateId]
    );

    const [recentOrders] = await pool.execute<RowDataPacket[]>(
      `SELECT o.id, o.order_number, o.product_name, o.amount, o.status, o.ordered_at,
              p.name AS patient_name
       FROM orders o
       JOIN patients p ON p.id = o.patient_id
       WHERE o.affiliate_id = ?
       ORDER BY o.ordered_at DESC
       LIMIT 8`,
      [affiliateId]
    );

    const [recentPatients] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, email, status, joined_at, active_program
       FROM patients
       WHERE affiliate_id = ?
       ORDER BY joined_at DESC
       LIMIT 5`,
      [affiliateId]
    );

    // Fill 30-day sales series
    const byDay = new Map(
      salesRows.map((r) => [
        String(r.day).slice(0, 10),
        {
          revenue: Number(r.revenue),
          orders: Number(r.orders),
        },
      ])
    );
    const salesData: {
      date: string;
      label: string;
      revenue: number;
      orders: number;
      patients: number;
    }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const hit = byDay.get(key);
      salesData.push({
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: hit?.revenue || 0,
        orders: hit?.orders || 0,
        patients: 0,
      });
    }

    return {
      stats: {
        patientsCount: Number(patientCount?.c || 0),
        ordersCount: Number(orderStats?.orders_count || 0),
        revenue: Number(orderStats?.revenue || 0),
        pendingCommission: Number(pendingCommission?.pending || 0),
      },
      salesData,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        productName: o.product_name,
        patientName: o.patient_name,
        total: Number(o.amount),
        orderStatus: o.status,
        date: o.ordered_at
          ? new Date(o.ordered_at).toISOString()
          : new Date().toISOString(),
      })),
      recentPatients: recentPatients.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        status:
          p.status === 'Pending Intake'
            ? 'Pending'
            : p.status === 'Inactive'
              ? 'Inactive'
              : 'Active',
        plan: p.active_program || '',
        joinedDate: p.joined_at
          ? new Date(p.joined_at).toISOString()
          : new Date().toISOString(),
      })),
    };
  },

  async listProducts(affiliateId: string) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         p.id, p.name, p.category, p.description, p.image_url,
         p.base_price, p.minimum_price, p.status, p.stock_status,
         app.selling_price, app.is_active AS price_active
       FROM products p
       LEFT JOIN affiliate_product_prices app
         ON app.product_id = p.id AND app.affiliate_id = ?
       WHERE p.status = 'Active'
       ORDER BY p.name ASC`,
      [affiliateId]
    );

    return rows.map((r) => {
      const minimumPrice = Number(r.minimum_price);
      const basePrice = Number(r.base_price);
      const sellingPrice =
        r.selling_price != null ? Number(r.selling_price) : null;
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        description: r.description || '',
        imageUrl: r.image_url || null,
        basePrice,
        minimumPrice,
        stockStatus: r.stock_status,
        status: r.status,
        sellingPrice,
        isPriced: sellingPrice != null && Number(r.price_active) === 1,
      };
    });
  },

  async setProductPrice(
    affiliateId: string,
    productId: string,
    input: SetAffiliatePriceInput
  ) {
    const [products] = await pool.execute<RowDataPacket[]>(
      `SELECT id, minimum_price, status FROM products WHERE id = ? LIMIT 1`,
      [productId]
    );
    if (!products[0]) throw new AppError('Product not found', 404);
    if (products[0].status !== 'Active') {
      throw new AppError('Product is not available', 400);
    }
    const min = Number(products[0].minimum_price);
    if (input.sellingPrice < min) {
      throw new AppError(
        `Selling price must be at least $${min.toFixed(2)} (minimum floor)`,
        400
      );
    }

    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM affiliate_product_prices
       WHERE affiliate_id = ? AND product_id = ? LIMIT 1`,
      [affiliateId, productId]
    );

    if (existing[0]) {
      await pool.execute(
        `UPDATE affiliate_product_prices
         SET selling_price = ?, is_active = 1
         WHERE affiliate_id = ? AND product_id = ?`,
        [input.sellingPrice, affiliateId, productId]
      );
    } else {
      await pool.execute(
        `INSERT INTO affiliate_product_prices
          (id, affiliate_id, product_id, selling_price, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [randomUUID(), affiliateId, productId, input.sellingPrice]
      );
    }

    const productsList = await this.listProducts(affiliateId);
    const product = productsList.find((p) => p.id === productId);
    return product!;
  },

  async listPatients(affiliateId: string) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         p.id, p.name, p.email, p.phone, p.status, p.active_program,
         p.joined_at,
         (SELECT COUNT(*) FROM orders o WHERE o.patient_id = p.id) AS orders_count,
         (SELECT COALESCE(SUM(o.amount),0) FROM orders o
            WHERE o.patient_id = p.id AND o.status NOT IN ('Cancelled','Refunded')) AS total_spent
       FROM patients p
       WHERE p.affiliate_id = ?
       ORDER BY p.joined_at DESC`,
      [affiliateId]
    );

    return rows.map((r) => ({
      id: r.id,
      affiliateId,
      name: r.name,
      email: r.email,
      phone: r.phone || '',
      joinedDate: r.joined_at
        ? new Date(r.joined_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '',
      ordersCount: Number(r.orders_count || 0),
      totalSpent: Number(r.total_spent || 0),
      status:
        r.status === 'Pending Intake'
          ? ('Pending' as const)
          : r.status === 'Inactive'
            ? ('Inactive' as const)
            : ('Active' as const),
      plan: r.active_program || '—',
      address: '',
      notes: '',
    }));
  },

  async createPatient(affiliateId: string, input: CreateAffiliatePatientInput) {
    const email = input.email.toLowerCase().trim();
    const [dup] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM patients WHERE affiliate_id = ? AND email = ? LIMIT 1`,
      [affiliateId, email]
    );
    if (dup.length) {
      throw new AppError('A customer with this email already exists', 409);
    }

    const id = randomUUID();
    await pool.execute(
      `INSERT INTO patients
        (id, affiliate_id, name, email, phone, status, active_program)
       VALUES (?, ?, ?, ?, ?, 'Pending Intake', ?)`,
      [
        id,
        affiliateId,
        input.name.trim(),
        email,
        input.phone?.trim() || null,
        input.plan?.trim() || null,
      ]
    );

    const patients = await this.listPatients(affiliateId);
    return patients.find((p) => p.id === id)!;
  },

  async listOrders(affiliateId: string) {
    const profile = await this.getProfile(affiliateId);
    const rate = profile.commissionRate;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         o.id, o.order_number, o.product_name, o.amount, o.status,
         o.payment_method, o.shipping_status, o.ordered_at,
         p.id AS patient_id, p.name AS patient_name, p.email AS patient_email,
         p.phone AS patient_phone,
         pr.category AS product_category
       FROM orders o
       JOIN patients p ON p.id = o.patient_id
       LEFT JOIN products pr ON pr.id = o.product_id
       WHERE o.affiliate_id = ?
       ORDER BY o.ordered_at DESC`,
      [affiliateId]
    );

    return rows.map((r) => {
      const total = Number(r.amount);
      const commissionAmount = Math.round(total * (rate / 100) * 100) / 100;
      return {
        id: r.id,
        affiliateId,
        patientId: r.patient_id,
        patientName: r.patient_name,
        patientEmail: r.patient_email,
        patientPhone: r.patient_phone || '',
        date: r.ordered_at
          ? new Date(r.ordered_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '',
        productName: r.product_name,
        productCategory: r.product_category || 'Medical Program',
        quantity: 1,
        subtotal: total,
        discount: 0,
        tax: 0,
        total,
        commissionRate: rate,
        commissionAmount,
        commissionStatus:
          r.status === 'Completed'
            ? ('Approved' as const)
            : r.status === 'Cancelled' || r.status === 'Refunded'
              ? ('Rejected' as const)
              : ('Pending' as const),
        orderStatus: r.status as
          | 'Pending'
          | 'Processing'
          | 'Completed'
          | 'Cancelled'
          | 'Refunded',
        paymentMethod: r.payment_method || 'Card',
        timeline: [
          {
            step: 'Placed',
            date: r.ordered_at
              ? new Date(r.ordered_at).toLocaleString()
              : '',
            completed: true,
          },
          {
            step: 'Processing',
            date: '',
            completed: ['Processing', 'Completed'].includes(r.status),
            current: r.status === 'Processing',
          },
          {
            step: 'Completed',
            date: '',
            completed: r.status === 'Completed',
            current: r.status === 'Completed',
          },
        ],
      };
    });
  },

  async listCommissions(affiliateId: string) {
    const profile = await this.getProfile(affiliateId);
    const rate = profile.commissionRate;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         o.id, o.amount, o.status, o.ordered_at,
         p.name AS patient_name
       FROM orders o
       JOIN patients p ON p.id = o.patient_id
       WHERE o.affiliate_id = ?
         AND o.status NOT IN ('Cancelled', 'Refunded')
       ORDER BY o.ordered_at DESC
       LIMIT 100`,
      [affiliateId]
    );

    return rows.map((r) => {
      const orderAmount = Number(r.amount);
      const commission = Math.round(orderAmount * (rate / 100) * 100) / 100;
      return {
        id: `comm-${r.id}`,
        orderId: r.id,
        affiliateId,
        patientName: r.patient_name,
        orderDate: r.ordered_at
          ? new Date(r.ordered_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '',
        orderAmount,
        commissionRate: rate,
        commission,
        status:
          r.status === 'Completed'
            ? ('Approved' as const)
            : ('Pending' as const),
        date: r.ordered_at
          ? new Date(r.ordered_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '',
      };
    });
  },

  async listPayments(affiliateId: string) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, gross_amount, commission, status, method, transaction_at
       FROM payment_transactions
       WHERE affiliate_id = ?
       ORDER BY transaction_at DESC`,
      [affiliateId]
    );

    return rows.map((r) => ({
      id: r.id,
      affiliateId,
      date: r.transaction_at
        ? new Date(r.transaction_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : '',
      amount: Number(r.gross_amount),
      method: (String(r.method).includes('ACH')
        ? 'ACH Direct'
        : String(r.method).includes('PayPal')
          ? 'PayPal'
          : 'Bank Transfer') as 'Bank Transfer' | 'PayPal' | 'ACH Direct',
      reference: r.id.slice(0, 8).toUpperCase(),
      status: r.status as 'Paid' | 'Pending' | 'Processing' | 'Failed',
      coveredOrdersCount: 0,
      accountDestination: '—',
      notes: `Commission ${Number(r.commission).toFixed(2)}`,
    }));
  },
};
