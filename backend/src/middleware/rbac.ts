const express = require('express');

// Permission matrix based on plan
const ROLE_PERMISSIONS = {
  admin: [
    'leads:*', 'students:*', 'courses:*', 'classes:*', 'sessions:*',
    'attendance:*', 'finance:*', 'teachers:*', 'reports:*', 'system:*'
  ],
  manager: [
    'leads:read', 'leads:write', 'students:read', 'students:write',
    'courses:read', 'courses:write', 'classes:read', 'classes:write',
    'sessions:read', 'sessions:write', 'attendance:read', 'attendance:write',
    'finance:read', 'teachers:read', 'teachers:write', 'reports:read'
  ],
  sales: [
    'leads:*', 'students:read', 'classes:read', 'reports:own'
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

const requirePermission = (module, action) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const requiredPermission = `${module}:${action}`;
    
    // Admin có tất cả quyền
    if (userRoles.includes('admin')) {
      return next();
    }

    // Kiểm tra permission cho từng role
    const hasPermission = userRoles.some(role => {
      const permissions = ROLE_PERMISSIONS[role] || [];
      return permissions.includes(`${module}:*`) || 
             permissions.includes(requiredPermission) ||
             permissions.includes(`${module}:read`) && action === 'read';
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

// Check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
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

module.exports = { requirePermission, requireRole };
