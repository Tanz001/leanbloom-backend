import { NextFunction, Request, Response } from 'express';
import { StorefrontService } from '../services/storefront.service';
import { AppError } from '../middleware/errorHandler';
import { storefrontCheckoutSchema } from '../utils/validation';

export const StorefrontController = {
  async listTenants(_req: Request, res: Response, next: NextFunction) {
    try {
      const tenants = await StorefrontService.listTenants();
      res.json({ tenants });
    } catch (err) {
      next(err);
    }
  },

  async resolveTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const host =
        typeof req.query.host === 'string' ? req.query.host : undefined;
      const slug =
        typeof req.query.slug === 'string' ? req.query.slug : undefined;
      const id = typeof req.query.id === 'string' ? req.query.id : undefined;
      const tenant = await StorefrontService.resolveTenant({ host, slug, id });
      res.json({ tenant });
    } catch (err) {
      next(err);
    }
  },

  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const affiliateId = String(req.params.affiliateId || '');
      if (!affiliateId) throw new AppError('affiliateId is required', 400);
      const result = await StorefrontService.listProducts(affiliateId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = storefrontCheckoutSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message || 'Invalid checkout payload',
          400
        );
      }
      const result = await StorefrontService.checkout(parsed.data);
      res.status(201).json({
        message: 'Order submitted for clinical review',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },
};
