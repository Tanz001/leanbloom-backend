import { NextFunction, Response } from 'express';
import { PlanService } from '../services/plan.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types/auth';
import { createPlanSchema, updatePlanSchema } from '../utils/validation';

export const PlanController = {
  async listPublic(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plans = await PlanService.list({ activeOnly: true });
      res.json({ plans });
    } catch (err) {
      next(err);
    }
  },

  async listAdmin(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plans = await PlanService.list();
      res.json({ plans });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid plan', 400);
      }
      const plan = await PlanService.create(parsed.data);
      res.status(201).json({ message: 'Plan created', plan });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = updatePlanSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid plan', 400);
      }
      const plan = await PlanService.update(req.params.id, parsed.data);
      res.json({ message: 'Plan updated', plan });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await PlanService.remove(req.params.id);
      res.json({ message: 'Plan deleted' });
    } catch (err) {
      next(err);
    }
  },
};
