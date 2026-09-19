import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { getNum } from '../lib/settings';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

const assessmentSchema = z.object({
  studentId: z.string(),
  enrollmentId: z.string().optional().nullable(),
  type: z.enum(['quizizz', 'midterm', 'final', 'jlpt_real']),
  date: z.string(),
  score: z.number().optional().nullable(),
  maxScore: z.number().optional().nullable(),
  jlptResult: z.enum(['pass', 'fail']).optional().nullable(),
  grade: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Compute percent + passed theo ngưỡng pass_threshold (mặc định 0.6)
async function computeResult(score: number | null | undefined, maxScore: number | null | undefined, jlptResult?: string | null) {
  const threshold = await getNum('pass_threshold', 0.6);
  let percent: number | null = null;
  if (score != null && maxScore != null && maxScore > 0) {
    percent = score / maxScore;
  }
  let passed: boolean | null = null;
  if (jlptResult) {
    passed = jlptResult === 'pass';
  } else if (percent !== null) {
    passed = percent >= threshold;
  }
  return { percent, passed };
}

// GET /api/assessments?studentId=&enrollmentId=&type=&classId=
router.get('/', requirePermission('students', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.query.studentId) where.studentId = req.query.studentId;
    if (req.query.enrollmentId) where.enrollmentId = req.query.enrollmentId;
    if (req.query.type) where.type = req.query.type;
    if (req.query.classId) {
      const members = await prisma.classMember.findMany({
        where: { classId: req.query.classId as string, status: 'active' },
        select: { studentId: true },
      });
      where.studentId = { in: members.map(m => m.studentId) };
    }

    const data = await prisma.assessment.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        student: { select: { id: true, code: true, name: true } },
      },
    });
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// GET /api/assessments/student/:studentId — tất cả điểm của 1 HV
router.get('/student/:studentId', requirePermission('students', 'read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await prisma.assessment.findMany({
      where: { studentId: req.params.studentId },
      orderBy: { date: 'desc' },
    });
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// POST /api/assessments — nhập tay 1 bản ghi điểm
router.post('/', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = assessmentSchema.parse(req.body);
    const { percent, passed } = await computeResult(data.score, data.maxScore, data.jlptResult);

    const record = await prisma.assessment.create({
      data: {
        ...data,
        enrollmentId: data.enrollmentId || null,
        score: data.score ?? null,
        maxScore: data.maxScore ?? null,
        jlptResult: data.jlptResult || null,
        grade: data.grade || null,
        notes: data.notes || null,
        percent,
        passed,
        date: new Date(data.date),
        createdBy: req.user?.id || 'system',
      },
      include: { student: { select: { id: true, code: true, name: true } } },
    });
    res.status(201).json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// POST /api/assessments/import — import CSV
// Header: student_code,type,date,score,max_score,jlpt_result,grade,notes
// Hoặc JSON array: { studentCode, type, date, score, maxScore, jlptResult, grade, notes }
router.post('/import', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { csv, rows: jsonRows } = req.body;
    let rows: Record<string, string>[] = [];

    if (Array.isArray(jsonRows)) {
      rows = jsonRows.map((r: any) => ({
        student_code: r.studentCode || r.student_code || '',
        type: r.type || '',
        date: r.date || '',
        score: String(r.score ?? ''),
        max_score: String(r.maxScore ?? r.max_score ?? ''),
        jlpt_result: r.jlptResult || r.jlpt_result || '',
        grade: r.grade || '',
        notes: r.notes || '',
      }));
    } else if (typeof csv === 'string') {
      const lines = csv.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return res.status(400).json({ error: 'CSV cần header + ít nhất 1 dòng' });
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
      rows = lines.slice(1).map(line => {
        const cells = line.split(',').map(c => c.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
        return obj;
      });
    } else {
      return res.status(400).json({ error: 'Cần csv (text) hoặc rows (array)' });
    }

    const validTypes = ['quizizz', 'midterm', 'final', 'jlpt_real'];
    const threshold = await getNum('pass_threshold', 0.6);
    const results = { imported: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const lineNo = i + 2;
      if (!r.student_code) { results.errors.push(`Dòng ${lineNo}: thiếu student_code`); continue; }
      if (!validTypes.includes(r.type)) { results.errors.push(`Dòng ${lineNo}: type sai (${r.type}) — dùng quizizz/midterm/final/jlpt_real`); continue; }
      if (!r.date) { results.errors.push(`Dòng ${lineNo}: thiếu date`); continue; }

      const student = await prisma.student.findFirst({ where: { code: r.student_code } });
      if (!student) { results.errors.push(`Dòng ${lineNo}: không tìm thấy HV ${r.student_code}`); continue; }

      const score = r.score !== '' ? parseFloat(r.score) : null;
      const maxScore = r.max_score !== '' ? parseFloat(r.max_score) : null;
      const jr = (r.jlpt_result || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const jlptResult = r.jlpt_result ? ((jr.includes('pass') || jr.includes('dau') || jr.includes('dat')) && !jr.includes('rot') ? 'pass' : 'fail') : null;

      const percent = (score != null && maxScore != null && maxScore > 0) ? score / maxScore : null;
      const passed = jlptResult ? jlptResult === 'pass' : (percent !== null ? percent >= threshold : null);

      // Tìm enrollment active của HV để link (nếu có)
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: student.id, status: { in: ['studying', 'reserved', 'enrolled'] } },
        orderBy: { enrolledAt: 'desc' },
        select: { id: true },
      });

      await prisma.assessment.create({
        data: {
          studentId: student.id,
          enrollmentId: enrollment?.id || null,
          type: r.type,
          date: new Date(r.date),
          score, maxScore, percent, passed,
          jlptResult,
          grade: r.grade || null,
          notes: r.notes || null,
          createdBy: req.user?.id || 'system',
        },
      });
      results.imported++;
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// PATCH /api/assessments/:id/send — đánh dấu đã gửi kết quả cho HV
router.patch('/:id/send', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const record = await prisma.assessment.update({
      where: { id: req.params.id },
      data: { sentToStudent: true },
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/assessments/:id
router.delete('/:id', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.assessment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
