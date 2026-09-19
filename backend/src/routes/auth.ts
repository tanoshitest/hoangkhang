import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.string(),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((ur) => ur.role.name),
        studentId: user.studentId,
        teacherId: user.teacherId,
      },
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

// POST /api/auth/register (admin only)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const roleRecord = await prisma.role.findUnique({
      where: { name: role },
    });

    if (!roleRecord) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        roles: {
          create: {
            roleId: roleRecord.id,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((ur) => ur.role.name),
      },
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

// POST /api/auth/google — đăng nhập Google cho HV (auto-tạo tài khoản nếu email khớp Student) + GV/staff đã có account
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) return res.status(400).json({ error: 'idToken required' });
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Đăng nhập Google chưa được cấu hình (GOOGLE_CLIENT_ID)' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const googleId = payload?.sub;
    if (!email || !googleId) {
      return res.status(401).json({ error: 'Token Google không hợp lệ' });
    }

    // 1) user đã link googleId → login
    let user = await prisma.user.findUnique({
      where: { googleId },
      include: { roles: { include: { role: true } } },
    });

    // 2) user tồn tại theo email → link googleId
    if (!user) {
      const byEmail = await prisma.user.findUnique({
        where: { email },
        include: { roles: { include: { role: true } } },
      });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId, authProvider: 'google' },
          include: { roles: { include: { role: true } } },
        });
      }
    }

    // 3) chưa có user → tự tạo nếu email khớp hồ sơ học viên
    if (!user) {
      const student = await prisma.student.findFirst({ where: { email } });
      if (!student) {
        return res.status(403).json({
          error: 'Email chưa được cấp tài khoản. Vui lòng liên hệ trung tâm.',
        });
      }
      const studentRole = await prisma.role.findUnique({ where: { name: 'student' } });
      if (!studentRole) return res.status(500).json({ error: 'Role student chưa được seed' });
      user = await prisma.user.create({
        data: {
          email,
          name: student.name,
          phone: student.phone,
          googleId,
          authProvider: 'google',
          studentId: student.id,
          roles: { create: { roleId: studentRole.id } },
        },
        include: { roles: { include: { role: true } } },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((ur) => ur.role.name),
        studentId: user.studentId,
        teacherId: user.teacherId,
      },
    });
  } catch (error: any) {
    if (error?.message?.includes('Token used too late') || error?.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Token Google không hợp lệ hoặc đã hết hạn' });
    }
    console.error(error);
    res.status(500).json({ error: 'Google login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
