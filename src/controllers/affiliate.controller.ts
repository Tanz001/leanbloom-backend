import { NextFunction, Response } from 'express';
import { AffiliatePortalService } from '../services/affiliatePortal.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types/auth';
import {
  createAffiliatePatientSchema,
  setAffiliatePriceSchema,
} from '../utils/validation';

function affiliateId(req: AuthenticatedRequest): string {
  const id = req.user?.affiliateId;
  if (!id) throw new AppError('Affiliate context missing', 403);
  return id;
}

export const AffiliateController = {
  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await AffiliatePortalService.getProfile(affiliateId(req));
      res.json({
        profile,
        user: req.user,
      });
    } catch (err) {
      next(err);
    }
  },

  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await AffiliatePortalService.getDashboard(affiliateId(req));
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async listProducts(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const products = await AffiliatePortalService.listProducts(
        affiliateId(req)
      );
      res.json({ products });
    } catch (err) {
      next(err);
    }
  },

  async setProductPrice(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const parsed = setAffiliatePriceSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message || 'Invalid input',
          400
        );
      }
      const product = await AffiliatePortalService.setProductPrice(
        affiliateId(req),
        String(req.params.id),
        parsed.data
      );
      res.json({ message: 'Price updated', product });
    } catch (err) {
      next(err);
    }
  },

  async listPatients(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const patients = await AffiliatePortalService.listPatients(
        affiliateId(req)
      );
      res.json({ patients });
    } catch (err) {
      next(err);
    }
  },

  async createPatient(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const parsed = createAffiliatePatientSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues[0]?.message || 'Invalid input',
          400
        );
      }
      const patient = await AffiliatePortalService.createPatient(
        affiliateId(req),
        parsed.data
      );
      res.status(201).json({ message: 'Customer created', patient });
    } catch (err) {
      next(err);
    }
  },

  async listOrders(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const orders = await AffiliatePortalService.listOrders(affiliateId(req));
      res.json({ orders });
    } catch (err) {
      next(err);
    }
  },

  async listCommissions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const commissions = await AffiliatePortalService.listCommissions(
        affiliateId(req)
      );
      res.json({ commissions });
    } catch (err) {
      next(err);
    }
  },

  async listPayments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const payments = await AffiliatePortalService.listPayments(
        affiliateId(req)
      );
      res.json({ payments });
    } catch (err) {
      next(err);
    }
  },
};
