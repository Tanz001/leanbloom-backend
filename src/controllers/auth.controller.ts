import { NextFunction, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types/auth';
import {
  affiliateSignupSchema,
  changePasswordSchema,
  loginSchema,
  updateProfileSchema,
} from '../utils/validation';

export const AuthController = {
  async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }

      const result = await AuthService.login(parsed.data);
      res.json({
        message: 'Login successful',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  async signupAffiliate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const parsed = affiliateSignupSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }

      const result = await AuthService.signupAffiliate(parsed.data);
      res.status(201).json({
        message:
          'Affiliate account created. Your clinic is Pending until LeanBloom activates it.',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      const user = await AuthService.getMe(req.user);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }

      const result = await AuthService.updateProfile(req.user, parsed.data);
      res.json({
        message: 'Profile updated',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }

      await AuthService.changePassword(req.user, parsed.data);
      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  },
};
