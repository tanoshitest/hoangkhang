import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';

// Permission matrix based on plan
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'leads:*', 'students:*', 'courses:*', 'classes:*', 'sessions:*',
    'attendance:*', 'finance:*', 'teachers:*', 'reports:*', 'system:*',
    'approvals:*', 'commissions:*', 'chat:*'
  ],
  manager: [
    'leads:read', 'leads:write', 'students:read', 'students:write',
    'courses:read', 'courses:write', 'classes:read', 'classes:write',
    'sessions:read', 'sessions:write', 'attendance:read', 'attendance:write',
    'finance:read', 'teachers:read', 'teachers:write', 'reports:read',
    'commissions:read', 'chat:use'
  ],
  sales: [
    'leads:*', 'students:read', 'classes:read', 'reports:own',
    'commissions:read', 'chat:use'
  ],
  sales_leader: [
    'leads:*', 'students:read', 'classes:read', 'reports:read',
    'approvals:read', 'approvals:level1', 'commissions:read', 'chat:use'
  ],
  academic: [
    'leads:read', 'students:*', 'courses:*', 'classes:*', 'sessions:*',
    'attendance:*', 'teachers:read', 'finance:read', 'reports:academic'
  ],
  teacher: [
    'students:assigned', 'classes:assigned', 'sessions:assigned',
    'attendance:write', 'reports:assigned'
  ],
  accountant: [
    'leads:read', 'students:read', 'classes:read', 'finance:*',
    'teachers:read', 'reports:finance'
  ]
};

export const requirePermission = (module: string, action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];
    const requiredPermission = `${module}:${action}`;

    if (userRoles.includes('admin')) {
      return next();
    }

    const hasPermission = userRoles.some(role => {
      const permissions = ROLE_PERMISSIONS[role] || [];
      return permissions.includes(`${module}:*`) ||
             permissions.includes(requiredPermission);
    });

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredPermission,
        userRoles
      });
    }

    next();
  };
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Insufficient role',
        required: roles,
        userRoles
      });
    }

    next();
  };
};
