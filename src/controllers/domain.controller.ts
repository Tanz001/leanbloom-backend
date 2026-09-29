import { NextFunction, Response } from 'express';
import { DomainService } from '../services/domain.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types/auth';
import {
  createDomainSchema,
  updateDomainSchema,
} from '../utils/validation';

export const DomainController = {
  async list(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const domains = await DomainService.list();
      res.json({ domains });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = createDomainSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }
      const domain = await DomainService.create(parsed.data);
      res.status(201).json({ message: 'Domain created', domain });
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = updateDomainSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }
      const domain = await DomainService.update(req.params.id, parsed.data);
      res.json({ message: 'Domain updated', domain });
    } catch (err) {
      next(err);
    }
  },

  async verify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const domain = await DomainService.verify(req.params.id);
      res.json({ message: 'Domain verified', domain });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await DomainService.remove(req.params.id);
      res.json({ message: 'Domain deleted' });
    } catch (err) {
      next(err);
    }
  },
};
