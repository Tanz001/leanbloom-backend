export type AdminRole = 'master_admin' | 'admin' | 'support';
export type AdminStatus = 'Active' | 'Invited' | 'Suspended';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
}
