import { Request } from 'express';

export type PortalType = 'admin' | 'affiliate';

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  portal: PortalType;
  role: string;
  affiliateId?: string;
  affiliateName?: string;
};

export type SubscriptionSummary = {
  status: 'none' | 'pending_payment' | 'active' | 'expired' | 'cancelled';
  hasAccess: boolean;
  planName?: string;
  planPrice?: number;
  endsAt?: string | null;
  daysRemaining?: number | null;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  portal: PortalType;
  role: string;
  status: string;
  affiliateId?: string;
  affiliateName?: string;
  affiliateStatus?: string;
  avatarUrl?: string | null;
  subscription?: SubscriptionSummary;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
  tokenPayload?: JwtPayload;
};
