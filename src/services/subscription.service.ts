import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { PlanService } from './plan.service';
import { PaypalService } from './paypal.service';

type SubRow = RowDataPacket & {
  id: string;
  affiliate_id: string;
  plan_id: string;
  plan_name: string;
  plan_price: string | number;
  status: 'pending_payment' | 'active' | 'expired' | 'cancelled';
  starts_at: Date | null;
  ends_at: Date | null;
  cancelled_at: Date | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  last_payment_at: Date | null;
  created_at: Date;
  affiliate_name?: string;
  contact_email?: string;
};

export type BillingQuote = {
  /** First checkout is 3 months at 10% off. Later checkouts are 1 full-price month. */
  kind: 'initial' | 'monthly';
  months: number;
  monthlyPrice: number;
  listAmount: number;
  discountPercent: number;
  amountDue: number;
  label: string;
};

export type SubscriptionInfo = {
  id: string;
  affiliateId: string;
  planId: string;
  planName: string;
  planPrice: number;
  status: 'pending_payment' | 'active' | 'expired' | 'cancelled';
  startsAt: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
  lastPaymentAt: string | null;
  hasAccess: boolean;
  daysRemaining: number | null;
  billing: BillingQuote;
};

const INITIAL_MONTHS = 3;
const INITIAL_DISCOUNT_PERCENT = 10;

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function quoteBilling(
  monthlyPrice: number,
  hasPaidBefore: boolean
): BillingQuote {
  const monthly = money(Number(monthlyPrice) || 0);
  if (!hasPaidBefore) {
    const listAmount = money(monthly * INITIAL_MONTHS);
    const amountDue = money(
      listAmount * (1 - INITIAL_DISCOUNT_PERCENT / 100)
    );
    return {
      kind: 'initial',
      months: INITIAL_MONTHS,
      monthlyPrice: monthly,
      listAmount,
      discountPercent: INITIAL_DISCOUNT_PERCENT,
      amountDue,
      label: '3 months upfront, 10% off',
    };
  }
  return {
    kind: 'monthly',
    months: 1,
    monthlyPrice: monthly,
    listAmount: monthly,
    discountPercent: 0,
    amountDue: monthly,
    label: '1 month',
  };
}

function addMonths(from: Date, months: number) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

function iso(d: Date | null | undefined) {
  if (!d) return null;
  return new Date(d).toISOString();
}

function mapSub(row: SubRow): SubscriptionInfo {
  const now = Date.now();
  let status = row.status;
  const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;

  if (status === 'active' && endsAt !== null && endsAt < now) {
    status = 'expired';
  }

  const hasAccess = status === 'active' && (endsAt === null || endsAt >= now);
  const daysRemaining =
    hasAccess && endsAt !== null
      ? Math.max(0, Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24)))
      : hasAccess
        ? null
        : 0;

  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    planId: row.plan_id,
    planName: row.plan_name,
    planPrice: Number(row.plan_price),
    status,
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    cancelledAt: iso(row.cancelled_at),
    lastPaymentAt: iso(row.last_payment_at),
    hasAccess,
    daysRemaining,
    billing: quoteBilling(Number(row.plan_price), Boolean(row.last_payment_at)),
  };
}

async function getRawByAffiliate(affiliateId: string) {
  const [rows] = await pool.execute<SubRow[]>(
    `SELECT * FROM affiliate_subscriptions WHERE affiliate_id = ? LIMIT 1`,
    [affiliateId]
  );
  return rows[0] || null;
}

async function expireIfNeeded(row: SubRow) {
  if (
    row.status === 'active' &&
    row.ends_at &&
    new Date(row.ends_at).getTime() < Date.now()
  ) {
    await pool.execute(
      `UPDATE affiliate_subscriptions SET status = 'expired' WHERE id = ?`,
      [row.id]
    );
    row.status = 'expired';
  }
  return row;
}

export const SubscriptionService = {
  async getForAffiliate(affiliateId: string): Promise<SubscriptionInfo | null> {
    const row = await getRawByAffiliate(affiliateId);
    if (!row) return null;
    await expireIfNeeded(row);
    return mapSub(row);
  },

  /** Access gate: active paid sub, or no sub row (admin-created legacy). */
  async hasAccess(affiliateId: string): Promise<boolean> {
    const sub = await this.getForAffiliate(affiliateId);
    if (!sub) return true;
    return sub.hasAccess;
  },

  async listAll() {
    const [rows] = await pool.execute<SubRow[]>(
      `SELECT s.*, a.name AS affiliate_name, a.contact_email
       FROM affiliate_subscriptions s
       JOIN affiliates a ON a.id = s.affiliate_id
       ORDER BY s.updated_at DESC`
    );
    for (const row of rows) {
      await expireIfNeeded(row);
    }
    return rows.map((r) => ({
      ...mapSub(r),
      affiliateName: r.affiliate_name || '',
      contactEmail: r.contact_email || '',
    }));
  },

  async createPending(affiliateId: string, planId?: string) {
    const plan = planId
      ? await PlanService.getById(planId)
      : await PlanService.getDefaultActive();

    if (!plan.isActive) {
      throw new AppError('Selected plan is not available', 400);
    }

    const existing = await getRawByAffiliate(affiliateId);
    if (existing) {
      await pool.execute(
        `UPDATE affiliate_subscriptions
         SET plan_id = ?, plan_name = ?, plan_price = ?, status = 'pending_payment',
             cancelled_at = NULL
         WHERE id = ?`,
        [plan.id, plan.name, plan.price, existing.id]
      );
      return this.getForAffiliate(affiliateId);
    }

    await pool.execute(
      `INSERT INTO affiliate_subscriptions
        (affiliate_id, plan_id, plan_name, plan_price, status)
       VALUES (?, ?, ?, ?, 'pending_payment')`,
      [affiliateId, plan.id, plan.name, plan.price]
    );

    return this.getForAffiliate(affiliateId);
  },

  /** Complimentary access for admin-created affiliates */
  async createComplimentary(affiliateId: string) {
    const existing = await getRawByAffiliate(affiliateId);
    if (existing) return this.getForAffiliate(affiliateId);

    let plan;
    try {
      plan = await PlanService.getDefaultActive();
    } catch {
      return null;
    }

    await pool.execute(
      `INSERT INTO affiliate_subscriptions
        (affiliate_id, plan_id, plan_name, plan_price, status, starts_at, ends_at, last_payment_at)
       VALUES (?, ?, ?, ?, 'active', NOW(3), NULL, NOW(3))`,
      [affiliateId, plan.id, plan.name, 0]
    );
    return this.getForAffiliate(affiliateId);
  },

  async cancel(affiliateId: string) {
    const row = await getRawByAffiliate(affiliateId);
    if (!row) throw new AppError('No subscription found', 404);

    const stillPaid =
      row.status === 'active' &&
      row.ends_at &&
      new Date(row.ends_at).getTime() > Date.now();

    if (stillPaid) {
      // Mark cancelled but keep access until ends_at
      await pool.execute(
        `UPDATE affiliate_subscriptions
         SET cancelled_at = NOW(3)
         WHERE id = ?`,
        [row.id]
      );
    } else {
      await pool.execute(
        `UPDATE affiliate_subscriptions
         SET status = 'cancelled', cancelled_at = NOW(3)
         WHERE id = ?`,
        [row.id]
      );
      await pool.execute(
        `UPDATE affiliates SET status = 'Pending' WHERE id = ? AND status = 'Active'`,
        [affiliateId]
      );
    }

    return this.getForAffiliate(affiliateId);
  },

  async createPayPalOrder(affiliateId: string) {
    let sub = await this.getForAffiliate(affiliateId);
    if (!sub) {
      sub = await this.createPending(affiliateId);
    }
    if (!sub) throw new AppError('Could not create subscription', 500);

    const billing = sub.billing;
    if (billing.amountDue <= 0) {
      throw new AppError('No payment is due on this plan', 400);
    }

    const returnUrl = `${env.appPublicUrl.replace(/\/$/, '')}/#/subscription/complete`;
    const cancelUrl = `${env.appPublicUrl.replace(/\/$/, '')}/#/subscription`;

    const order = await PaypalService.createOrder({
      amount: billing.amountDue,
      description: `${sub.planName} — ${billing.label}`,
      returnUrl,
      cancelUrl,
    });

    await pool.execute(
      `UPDATE affiliate_subscriptions SET paypal_order_id = ? WHERE affiliate_id = ?`,
      [order.orderId, affiliateId]
    );

    return {
      orderId: order.orderId,
      approveUrl: order.approveUrl,
      mock: order.mock,
      amount: billing.amountDue,
      planName: sub.planName,
      billing,
    };
  },

  async capturePayPalOrder(affiliateId: string, orderId: string) {
    const row = await getRawByAffiliate(affiliateId);
    if (!row) throw new AppError('No subscription found', 404);

    if (row.paypal_order_id && row.paypal_order_id !== orderId) {
      // Allow capture of the latest order id passed from PayPal return
    }

    const capture = await PaypalService.captureOrder(orderId);
    if (capture.status !== 'COMPLETED' && capture.status !== 'APPROVED') {
      // PayPal may return COMPLETED on capture
      if (!capture.mock && capture.status !== 'COMPLETED') {
        throw new AppError(`Payment not completed (${capture.status})`, 402);
      }
    }

    const billing = quoteBilling(
      Number(row.plan_price),
      Boolean(row.last_payment_at)
    );
    const startsAt = new Date();
    const extendFrom =
      row.ends_at && new Date(row.ends_at).getTime() > Date.now()
        ? new Date(row.ends_at)
        : startsAt;
    const endsAt = addMonths(extendFrom, billing.months);

    await pool.execute(
      `UPDATE affiliate_subscriptions
       SET status = 'active',
           starts_at = COALESCE(starts_at, ?),
           ends_at = ?,
           cancelled_at = NULL,
           paypal_order_id = ?,
           paypal_capture_id = ?,
           last_payment_at = NOW(3)
       WHERE id = ?`,
      [startsAt, endsAt, orderId, capture.captureId, row.id]
    );

    await pool.execute(
      `UPDATE affiliates SET status = 'Active' WHERE id = ?`,
      [affiliateId]
    );

    return this.getForAffiliate(affiliateId);
  },
};
