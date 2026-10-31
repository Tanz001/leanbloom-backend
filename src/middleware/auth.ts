import { NextFunction, Response } from 'express';
import { AppError } from './errorHandler';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedRequest, AuthUser, PortalType } from '../types/auth';

function extractBearer(header?: string): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = extractBearer(req.headers.authorization);
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(token);
    const user: AuthUser = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      portal: payload.portal,
      role: payload.role,
      status: 'Active',
      affiliateId: payload.affiliateId,
      affiliateName: payload.affiliateName,
    };

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(new AppError('Your session expired. Please sign in again.', 401));
  }
}

export function requirePortal(...portals: PortalType[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!portals.includes(req.user.portal)) {
      return next(new AppError('You do not have permission to access this area.', 403));
    }
    next();
  };
}

export function requireAffiliate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  if (req.user.portal !== 'affiliate') {
    return next(new AppError('Affiliate access required', 403));
  }
  if (!req.user.affiliateId) {
    return next(new AppError('Affiliate context missing', 403));
  }
  if (req.user.status !== 'Active') {
    return next(new AppError('Account is not active', 403));
  }
  next();
}

export function requireMasterAdmin(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  if (req.user.portal !== 'admin') {
    return next(new AppError('Master admin access is required for this action.', 403));
  }
  if (!['master_admin', 'admin'].includes(req.user.role)) {
    return next(new AppError('Your admin role cannot perform this action.', 403));
  }
  next();
}

/** Blocks affiliate portal APIs until subscription is paid/active */
export async function requireActiveSubscription(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.affiliateId) {
      return next(new AppError('Affiliate context missing', 403));
    }
    const { SubscriptionService } = await import(
      '../services/subscription.service'
    );
    const allowed = await SubscriptionService.hasAccess(req.user.affiliateId);
    if (!allowed) {
      return next(
        new AppError(
          'Subscription required. Renew your plan to access the portal.',
          402
        )
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}
