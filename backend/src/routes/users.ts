const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requirePermission } = require('../middleware/rbac');
const bcrypt = require('bcrypt');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users - Get all users
router.get('/', requirePermission('system', 'read'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    res.json(users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      isActive: user.isActive,
      roles: user.roles.map(ur => ur.role.name),
      createdAt: user.createdAt,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', requirePermission('system', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      isActive: user.isActive,
      roles: user.roles.map(ur => ur.role.name),
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', requirePermission('system', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { name, phone, isActive },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        isActive: user.isActive,
        roles: user.roles.map(ur => ur.role.name),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/users/roles/list - Get all roles
router.get('/roles/list', async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: { isActive: true },
    });

    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

module.exports = router;
