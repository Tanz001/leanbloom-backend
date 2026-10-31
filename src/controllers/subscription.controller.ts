import { NextFunction, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { PaypalService } from '../services/paypal.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types/auth';
import { captureSubscriptionSchema } from '../utils/validation';

export const SubscriptionController = {
  async listAdmin(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const subscriptions = await SubscriptionService.listAll();
      res.json({ subscriptions });
    } catch (err) {
      next(err);
    }
  },

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const affiliateId = req.user?.affiliateId;
      if (!affiliateId) throw new AppError('Affiliate context missing', 403);
      const subscription = await SubscriptionService.getForAffiliate(affiliateId);
      res.json({
        subscription,
        paypal: {
          clientId: PaypalService.getClientId(),
          mock: PaypalService.isMockMode(),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const affiliateId = req.user?.affiliateId;
      if (!affiliateId) throw new AppError('Affiliate context missing', 403);
      const order = await SubscriptionService.createPayPalOrder(affiliateId);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async capture(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const affiliateId = req.user?.affiliateId;
      if (!affiliateId) throw new AppError('Affiliate context missing', 403);
      const parsed = captureSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid capture', 400);
      }
      const subscription = await SubscriptionService.capturePayPalOrder(
        affiliateId,
        parsed.data.orderId
      );
      res.json({ message: 'Subscription activated', subscription });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const affiliateId = req.user?.affiliateId;
      if (!affiliateId) throw new AppError('Affiliate context missing', 403);
      const subscription = await SubscriptionService.cancel(affiliateId);
      res.json({ message: 'Subscription cancelled', subscription });
    } catch (err) {
      next(err);
    }
  },
};
