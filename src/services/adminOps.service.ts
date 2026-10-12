import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import {
  CreateAdminOrderInput,
  CreateAdminPatientInput,
} from '../utils/validation';

function formatDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const AdminOpsService = {
  async listPatients(affiliateId?: string) {
    const params: string[] = [];
    let where = '';
    if (affiliateId) {
      where = 'WHERE p.affiliate_id = ?';
      params.push(affiliateId);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         p.id, p.name, p.email, p.phone, p.status, p.active_program,
         p.prescriptions_count, p.last_activity_at, p.joined_at,
         p.affiliate_id,
         a.name AS affiliate_name,
         (SELECT COUNT(*) FROM orders o WHERE o.patient_id = p.id) AS orders_count,
         (SELECT COALESCE(SUM(o.amount),0) FROM orders o
            WHERE o.patient_id = p.id AND o.status NOT IN ('Cancelled','Refunded')) AS total_spent
       FROM patients p
       JOIN affiliates a ON a.id = p.affiliate_id
       ${where}
       ORDER BY p.joined_at DESC`,
      params
    );

    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      email: r.email as string,
      phone: (r.phone as string) || '',
      affiliateId: r.affiliate_id as string,
      affiliateName: r.affiliate_name as string,
      ordersCount: Number(r.orders_count || 0),
      totalSpent: Number(r.total_spent || 0),
      status: r.status as 'Active' | 'Pending Intake' | 'Inactive',
      lastActivity: formatDate(r.last_activity_at) || formatDate(r.joined_at),
      joinedDate: formatDate(r.joined_at),
      activeProgram: (r.active_program as string) || '',
      prescriptionsCount: Number(r.prescriptions_count || 0),
    }));
  },

  async createPatient(input: CreateAdminPatientInput) {
    const [aff] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, status FROM affiliates WHERE id = ? LIMIT 1`,
      [input.affiliateId]
    );
    if (!aff[0]) throw new AppError('Affiliate not found', 404);

    const email = input.email.toLowerCase().trim();
    const [dup] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM patients WHERE affiliate_id = ? AND email = ? LIMIT 1`,
      [input.affiliateId, email]
    );
    if (dup.length) {
      throw new AppError(
        'A patient with this email already exists for that affiliate',
        409
      );
    }

    const id = randomUUID();
    await pool.execute(
      `INSERT INTO patients
        (id, affiliate_id, name, email, phone, status, active_program, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3))`,
      [
        id,
        input.affiliateId,
        input.name.trim(),
        email,
        input.phone?.trim() || null,
        input.status || 'Pending Intake',
        input.activeProgram?.trim() || null,
      ]
    );

    const list = await this.listPatients(input.affiliateId);
    const created = list.find((p) => p.id === id);
    if (!created) throw new AppError('Patient created but could not be loaded', 500);
    return created;
  },

  async listOrders(affiliateId?: string) {
    const params: string[] = [];
    let where = '';
    if (affiliateId) {
      where = 'WHERE o.affiliate_id = ?';
      params.push(affiliateId);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         o.id, o.order_number, o.product_name, o.amount, o.status,
         o.payment_method, o.shipping_status, o.ordered_at,
         o.affiliate_id, o.patient_id, o.product_id,
         a.name AS affiliate_name,
         p.name AS patient_name, p.email AS patient_email
       FROM orders o
       JOIN affiliates a ON a.id = o.affiliate_id
       JOIN patients p ON p.id = o.patient_id
       ${where}
       ORDER BY o.ordered_at DESC`,
      params
    );

    return rows.map((r) => ({
      id: (r.order_number as string) || (r.id as string),
      orderId: r.id as string,
      patientId: r.patient_id as string,
      patientName: r.patient_name as string,
      patientEmail: r.patient_email as string,
      affiliateId: r.affiliate_id as string,
      affiliateName: r.affiliate_name as string,
      productId: (r.product_id as string) || null,
      productName: r.product_name as string,
      amount: Number(r.amount),
      status: r.status as
        | 'Completed'
        | 'Processing'
        | 'Pending'
        | 'Cancelled'
        | 'Refunded',
      date: formatDate(r.ordered_at),
      paymentMethod: (r.payment_method as string) || '—',
      shippingStatus: (r.shipping_status as
        | 'Delivered'
        | 'In Transit'
        | 'Fulfillment Queue'
        | 'Pending Lab'
        | null) || undefined,
    }));
  },

  async createOrder(input: CreateAdminOrderInput) {
    const [aff] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name FROM affiliates WHERE id = ? LIMIT 1`,
      [input.affiliateId]
    );
    if (!aff[0]) throw new AppError('Affiliate not found', 404);

    const [patientRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, email, affiliate_id FROM patients WHERE id = ? LIMIT 1`,
      [input.patientId]
    );
    if (!patientRows[0]) throw new AppError('Patient not found', 404);
    if (patientRows[0].affiliate_id !== input.affiliateId) {
      throw new AppError('Patient does not belong to the selected affiliate', 400);
    }

    let productName = input.productName?.trim() || '';
    let productId: string | null = input.productId || null;
    let amount = input.amount;

    if (productId) {
      const [prodRows] = await pool.execute<RowDataPacket[]>(
        `SELECT id, name, base_price, status FROM products WHERE id = ? LIMIT 1`,
        [productId]
      );
      if (!prodRows[0]) throw new AppError('Product not found', 404);
      productName = productName || (prodRows[0].name as string);
      if (amount == null) {
        amount = Number(prodRows[0].base_price);
      }
    }

    if (!productName) {
      throw new AppError('Product name or productId is required', 400);
    }
    if (amount == null || Number.isNaN(Number(amount)) || Number(amount) < 0) {
      throw new AppError('Order amount is required', 400);
    }

    const id = randomUUID();
    const orderNumber = `LB-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      Math.random() * 900 + 100
    )}`;

    await pool.execute(
      `INSERT INTO orders
        (id, order_number, patient_id, affiliate_id, product_id, product_name,
         amount, status, payment_method, shipping_status, ordered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
      [
        id,
        orderNumber,
        input.patientId,
        input.affiliateId,
        productId,
        productName,
        Number(amount),
        input.status || 'Pending',
        input.paymentMethod?.trim() || null,
        input.shippingStatus || null,
      ]
    );

    await pool.execute(
      `UPDATE patients
       SET active_program = COALESCE(?, active_program),
           last_activity_at = NOW(3),
           status = CASE WHEN status = 'Inactive' THEN 'Active' ELSE status END
       WHERE id = ?`,
      [productName, input.patientId]
    );

    const list = await this.listOrders(input.affiliateId);
    const created = list.find((o) => o.orderId === id);
    if (!created) throw new AppError('Order created but could not be loaded', 500);
    return created;
  },
};
