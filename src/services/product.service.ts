import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import {
  CreateProductInput,
  UpdateProductInput,
} from '../utils/validation';

type ProductRow = RowDataPacket & {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  base_price: string | number;
  minimum_price: string | number;
  status: string;
  stock_status: string;
  created_at: Date;
  active_affiliates_count: number;
  orders_count: number;
};

function mapProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category as
      | 'Medical Program'
      | 'Telehealth Consult'
      | 'Prescription Refill'
      | 'Wellness Pack',
    description: row.description || '',
    imageUrl: row.image_url || null,
    basePrice: Number(row.base_price),
    minimumPrice: Number(row.minimum_price),
    status: row.status as 'Active' | 'Draft' | 'Archived',
    stockStatus: row.stock_status as 'In Stock' | 'Compounding' | 'Backorder',
    activeAffiliatesCount: Number(row.active_affiliates_count || 0),
    ordersCount: Number(row.orders_count || 0),
    createdAt: row.created_at
      ? new Date(row.created_at).toISOString()
      : undefined,
  };
}

const PRODUCT_SELECT = `
  SELECT
    p.id, p.name, p.category, p.description, p.image_url,
    p.base_price, p.minimum_price, p.status, p.stock_status, p.created_at,
    (
      SELECT COUNT(*) FROM affiliate_product_prices app
      WHERE app.product_id = p.id AND app.is_active = 1
    ) AS active_affiliates_count,
    (
      SELECT COUNT(*) FROM orders o WHERE o.product_id = p.id
    ) AS orders_count
  FROM products p
`;

export const ProductService = {
  async list(status?: string) {
    let sql = `${PRODUCT_SELECT} ORDER BY p.created_at DESC`;
    const params: string[] = [];
    if (status) {
      sql = `${PRODUCT_SELECT} WHERE p.status = ? ORDER BY p.created_at DESC`;
      params.push(status);
    }
    const [rows] = await pool.execute<ProductRow[]>(sql, params);
    return rows.map(mapProduct);
  },

  async getById(id: string) {
    const [rows] = await pool.execute<ProductRow[]>(
      `${PRODUCT_SELECT} WHERE p.id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) throw new AppError('Product not found', 404);
    return mapProduct(rows[0]);
  },

  async create(input: CreateProductInput) {
    if (input.minimumPrice < input.basePrice) {
      throw new AppError('Minimum price must be >= base price', 400);
    }

    const id = randomUUID();
    await pool.execute(
      `INSERT INTO products
        (id, name, category, description, image_url, base_price, minimum_price, status, stock_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name.trim(),
        input.category,
        input.description?.trim() || null,
        input.imageUrl?.trim() || null,
        input.basePrice,
        input.minimumPrice,
        input.status || 'Draft',
        input.stockStatus || 'In Stock',
      ]
    );

    return this.getById(id);
  },

  async update(id: string, input: UpdateProductInput) {
    const existing = await this.getById(id);

    const nextBase =
      input.basePrice !== undefined ? input.basePrice : existing.basePrice;
    const nextMin =
      input.minimumPrice !== undefined
        ? input.minimumPrice
        : existing.minimumPrice;

    if (nextMin < nextBase) {
      throw new AppError('Minimum price must be >= base price', 400);
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    const map: Record<string, unknown> = {
      name: input.name?.trim(),
      category: input.category,
      description: input.description,
      image_url: input.imageUrl,
      base_price: input.basePrice,
      minimum_price: input.minimumPrice,
      status: input.status,
      stock_status: input.stockStatus,
    };

    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        fields.push(`${col} = ?`);
        values.push(val);
      }
    }

    if (!fields.length) return existing;

    values.push(id);
    await pool.execute(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      values as (string | number | null)[]
    );

    return this.getById(id);
  },

  async remove(id: string) {
    await this.getById(id);
    await pool.execute(`DELETE FROM products WHERE id = ?`, [id]);
  },
};
