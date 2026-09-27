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
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
  tokenPayload?: JwtPayload;
};
