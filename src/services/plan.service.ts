import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreatePlanInput, UpdatePlanInput } from '../utils/validation';

type PlanRow = RowDataPacket & {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  billing_period: string;
  is_active: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

function mapPlan(row: PlanRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: Number(row.price),
    billingPeriod: row.billing_period as 'monthly',
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const PlanService = {
  async list(opts?: { activeOnly?: boolean }) {
    const where = opts?.activeOnly ? 'WHERE is_active = 1' : '';
    const [rows] = await pool.execute<PlanRow[]>(
      `SELECT * FROM subscription_plans ${where}
       ORDER BY sort_order ASC, created_at ASC`
    );
    return rows.map(mapPlan);
  },

  async getById(id: string) {
    const [rows] = await pool.execute<PlanRow[]>(
      `SELECT * FROM subscription_plans WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) throw new AppError('Plan not found', 404);
    return mapPlan(rows[0]);
  },

  async getDefaultActive() {
    const [rows] = await pool.execute<PlanRow[]>(
      `SELECT * FROM subscription_plans
       WHERE is_active = 1
       ORDER BY sort_order ASC, created_at ASC
       LIMIT 1`
    );
    if (!rows[0]) {
      throw new AppError(
        'No active subscription plan. Ask LeanBloom admin to create one.',
        404
      );
    }
    return mapPlan(rows[0]);
  },

  async create(input: CreatePlanInput) {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO subscription_plans (name, description, price, billing_period, is_active, sort_order)
       VALUES (?, ?, ?, 'monthly', ?, ?)`,
      [
        input.name.trim(),
        input.description?.trim() || null,
        input.price,
        input.isActive === false ? 0 : 1,
        input.sortOrder ?? 0,
      ]
    );
    // mysql2 may not return insertId for UUID default — fetch latest by name
    const [rows] = await pool.execute<PlanRow[]>(
      `SELECT * FROM subscription_plans WHERE name = ? ORDER BY created_at DESC LIMIT 1`,
      [input.name.trim()]
    );
    void result;
    return mapPlan(rows[0]);
  },

  async update(id: string, input: UpdatePlanInput) {
    await this.getById(id);
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      fields.push('name = ?');
      values.push(input.name.trim());
    }
    if (input.description !== undefined) {
      fields.push('description = ?');
      values.push(input.description?.trim() || null);
    }
    if (input.price !== undefined) {
      fields.push('price = ?');
      values.push(input.price);
    }
    if (input.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(input.isActive ? 1 : 0);
    }
    if (input.sortOrder !== undefined) {
      fields.push('sort_order = ?');
      values.push(input.sortOrder);
    }

    if (!fields.length) return this.getById(id);

    values.push(id);
    await pool.execute(
      `UPDATE subscription_plans SET ${fields.join(', ')} WHERE id = ?`,
      values as (string | number | null)[]
    );
    return this.getById(id);
  },

  async remove(id: string) {
    await this.getById(id);
    const [subs] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM affiliate_subscriptions WHERE plan_id = ? LIMIT 1`,
      [id]
    );
    if (subs.length) {
      throw new AppError(
        'Cannot delete a plan that has subscriptions. Deactivate it instead.',
        409
      );
    }
    await pool.execute(`DELETE FROM subscription_plans WHERE id = ?`, [id]);
  },
};
