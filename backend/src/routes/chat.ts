import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Helper: userIds mà tôi được phép chat (scope theo role)
async function allowedContactIds(user: NonNullable<AuthenticatedRequest['user']>): Promise<string[] | null> {
  const staffRoles = ['admin', 'manager', 'sales', 'sales_leader', 'academic', 'accountant'];
  if (user.roles.some(r => staffRoles.includes(r))) return null; // null = không giới hạn

  const ids = new Set<string>();
  if (user.studentId) {
    // HV → GV các lớp mình đang học + toàn bộ staff
    const classes = await prisma.class.findMany({
      where: { classMembers: { some: { studentId: user.studentId, status: 'active' } } },
      select: { mainTeacherId: true, supportTeacherId: true },
    });
    const teacherIds = classes.flatMap(c => [c.mainTeacherId, c.supportTeacherId].filter(Boolean) as string[]);
    const teacherUsers = await prisma.user.findMany({ where: { teacherId: { in: teacherIds } }, select: { id: true } });
    teacherUsers.forEach(u => ids.add(u.id));
  }
  if (user.teacherId) {
    // GV → HV các lớp mình phụ trách + staff
    const students = await prisma.classMember.findMany({
      where: {
        status: 'active',
        class: { OR: [{ mainTeacherId: user.teacherId }, { supportTeacherId: user.teacherId }] },
      },
      select: { studentId: true },
    });
    const studentIds = students.map(s => s.studentId);
    const studentUsers = await prisma.user.findMany({ where: { studentId: { in: studentIds } }, select: { id: true } });
    studentUsers.forEach(u => ids.add(u.id));
  }
  // HV/GV luôn chat được với staff
  const staff = await prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: { name: { in: staffRoles } } } } },
    select: { id: true },
  });
  staff.forEach(u => ids.add(u.id));
  ids.delete(user.id);
  return [...ids];
}

// GET /api/chat/contacts — danh bạ người được chat
router.get('/contacts', requirePermission('chat', 'use'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allowed = await allowedContactIds(req.user!);
    const where: any = { isActive: true, id: { not: req.user!.id } };
    if (allowed !== null) where.id = { in: allowed };
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true,
        roles: { select: { role: { select: { name: true } } } },
        student: { select: { code: true } },
        teacher: { select: { code: true } },
      },
      orderBy: { name: 'asc' },
      take: 200,
    });
    res.json({
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        roles: u.roles.map(r => r.role.name),
        code: u.student?.code || u.teacher?.code || null,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// GET /api/chat/conversations — hội thoại của tôi + tin cuối + số chưa đọc
router.get('/conversations', requirePermission('chat', 'use'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convs = await prisma.conversation.findMany({
      where: { participants: { some: { userId: req.user!.id } } },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const me = req.user!.id;
    const data = await Promise.all(convs.map(async c => {
      const myPart = c.participants.find(p => p.userId === me);
      const unread = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: me },
          ...(myPart?.lastReadAt ? { createdAt: { gt: myPart.lastReadAt } } : {}),
        },
      });
      const other = c.participants.find(p => p.userId !== me);
      return {
        id: c.id,
        title: c.title || other?.user.name || 'Hội thoại',
        isGroup: c.isGroup,
        participants: c.participants.map(p => ({ id: p.user.id, name: p.user.name })),
        lastMessage: c.messages[0] || null,
        unread,
        updatedAt: c.updatedAt,
      };
    }));
    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/chat/conversations — tạo/tìm hội thoại 1-1 với userId
router.post('/conversations', requirePermission('chat', 'use'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const me = req.user!.id;
    if (userId === me) return res.status(400).json({ error: 'Không thể chat với chính mình' });

    const allowed = await allowedContactIds(req.user!);
    if (allowed !== null && !allowed.includes(userId)) {
      return res.status(403).json({ error: 'Không được phép chat với người này' });
    }
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    // tìm hội thoại 1-1 đã có giữa 2 người
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: { every: { userId: { in: [me, userId] } } },
        AND: [
          { participants: { some: { userId: me } } },
          { participants: { some: { userId } } },
        ],
      },
      include: { participants: true },
    });
    if (existing) return res.json(existing);

    const conv = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: { create: [{ userId: me }, { userId }] },
      },
      include: { participants: true },
    });
    res.status(201).json(conv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/chat/conversations/:id/messages?since= — polling tin nhắn + đánh dấu đã đọc
router.get('/conversations/:id/messages', requirePermission('chat', 'use'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const me = req.user!.id;
    const part = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: me } },
    });
    if (!part) return res.status(403).json({ error: 'Không thuộc hội thoại này' });

    const since = req.query.since ? new Date(String(req.query.since)) : undefined;
    const messages = await prisma.message.findMany({
      where: {
        conversationId: req.params.id,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    await prisma.conversationParticipant.update({
      where: { id: part.id },
      data: { lastReadAt: new Date() },
    });

    res.json({ data: messages, now: new Date() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/chat/conversations/:id/messages — gửi tin
router.post('/conversations/:id/messages', requirePermission('chat', 'use'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const me = req.user!.id;
    const part = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id, userId: me } },
    });
    if (!part) return res.status(403).json({ error: 'Không thuộc hội thoại này' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content required' });

    const msg = await prisma.message.create({
      data: { conversationId: req.params.id, senderId: me, content: content.trim() },
      include: { sender: { select: { id: true, name: true } } },
    });
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });
    // thông báo cho người còn lại
    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId: req.params.id, userId: { not: me } },
      select: { userId: true },
    });
    if (others.length > 0) {
      await prisma.notification.createMany({
        data: others.map(o => ({
          userId: o.userId,
          title: `Tin nhắn mới từ ${req.user!.name}`,
          content: msg.content.slice(0, 120),
          type: 'chat_message',
        })),
      });
    }
    res.status(201).json(msg);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
