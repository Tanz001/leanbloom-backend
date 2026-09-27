import { NextFunction, Response } from 'express';
import { AffiliateService } from '../services/affiliate.service';
import { ProductService } from '../services/product.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types/auth';
import {
  createAffiliateSchema,
  createProductSchema,
  updateAffiliateSchema,
  updateProductSchema,
} from '../utils/validation';

export const AdminController = {
  async listUsers(_req: AuthenticatedRequest, res: Response) {
    res.status(501).json({ message: 'List admin users — coming next' });
  },

  async dashboardStats(_req: AuthenticatedRequest, res: Response) {
    res.status(501).json({ message: 'Dashboard stats — coming next' });
  },

  // —— Affiliates ——
  async listAffiliates(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const status =
        typeof req.query.status === 'string' ? req.query.status : undefined;
      const affiliates = await AffiliateService.list(status);
      res.json({ affiliates });
    } catch (err) {
      next(err);
    }
  },

  async getAffiliate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const affiliate = await AffiliateService.getById(String(req.params.id));
      res.json({ affiliate });
    } catch (err) {
      next(err);
    }
  },

  async createAffiliate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const parsed = createAffiliateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message || 'Invalid input',
          400
        );
      }

      const file = (req as AuthenticatedRequest & { file?: Express.Multer.File })
        .file;
      const logoUrl = file
        ? `/uploads/logos/${file.filename}`
        : parsed.data.logoUrl || null;

      const result = await AffiliateService.create({
        ...parsed.data,
        logoUrl,
      });
      res.status(201).json({
        message: 'Affiliate created',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateAffiliate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const parsed = updateAffiliateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message || 'Invalid input',
          400
        );
      }

      const file = (req as AuthenticatedRequest & { file?: Express.Multer.File })
        .file;
      const payload = { ...parsed.data };
      if (file) {
        payload.logoUrl = `/uploads/logos/${file.filename}`;
      }

      const affiliate = await AffiliateService.update(
        String(req.params.id),
        payload
      );
      res.json({ message: 'Affiliate updated', affiliate });
    } catch (err) {
      next(err);
    }
  },

  async deleteAffiliate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await AffiliateService.remove(String(req.params.id));
      res.json({ message: 'Affiliate deleted' });
    } catch (err) {
      next(err);
    }
  },

  // —— Products ——
  async listProducts(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const status =
        typeof req.query.status === 'string' ? req.query.status : undefined;
      const products = await ProductService.list(status);
      res.json({ products });
    } catch (err) {
      next(err);
    }
  },

  async getProduct(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const product = await ProductService.getById(String(req.params.id));
      res.json({ product });
    } catch (err) {
      next(err);
    }
  },

  async createProduct(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const parsed = createProductSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message || 'Invalid input',
          400
        );
      }

      const file = (req as AuthenticatedRequest & { file?: Express.Multer.File })
        .file;
      const imageUrl = file
        ? `/uploads/products/${file.filename}`
        : parsed.data.imageUrl || null;

      const product = await ProductService.create({
        ...parsed.data,
        imageUrl,
      });
      res.status(201).json({ message: 'Product created', product });
    } catch (err) {
      next(err);
    }
  },

  async updateProduct(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const parsed = updateProductSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message || 'Invalid input',
          400
        );
      }

      const file = (req as AuthenticatedRequest & { file?: Express.Multer.File })
        .file;
      const payload = { ...parsed.data };
      if (file) {
        payload.imageUrl = `/uploads/products/${file.filename}`;
      }

      const product = await ProductService.update(
        String(req.params.id),
        payload
      );
      res.json({ message: 'Product updated', product });
    } catch (err) {
      next(err);
    }
  },

  async deleteProduct(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      await ProductService.remove(String(req.params.id));
      res.json({ message: 'Product deleted' });
    } catch (err) {
      next(err);
    }
  },
};
