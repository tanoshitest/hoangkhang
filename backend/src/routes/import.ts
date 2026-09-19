import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from './admin';
import type { AuthenticatedRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Parse CSV text -> rows (handles quoted fields)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim()); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim()); field = '';
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  return rows.slice(1).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = r[i] || ''; });
    return obj;
  });
}

// ==================== IMPORT LEADS ====================

// POST /api/import/leads/preview - Validate CSV, return preview without saving
router.post('/leads/preview', requirePermission('leads', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv text required' });

    const objects = rowsToObjects(parseCsv(csv));
    const preview = await Promise.all(objects.map(async (o, idx) => {
      const errors: string[] = [];
      const name = o.name || o.ho_ten || o.ten;
      const phone = (o.phone || o.sdt || o.so_dien_thoai || '').replace(/[^\d+]/g, '');

      if (!name) errors.push('Thiếu tên');
      if (!phone) errors.push('Thiếu số điện thoại');

      let duplicate = false;
      if (phone) {
        const existing = await prisma.lead.findFirst({ where: { phone } });
        if (existing) {
          duplicate = true;
          errors.push(`Trùng với lead ${existing.code}`);
        }
      }

      return {
        row: idx + 2,
        valid: errors.length === 0,
        duplicate,
        errors,
        data: {
          name, phone,
          email: o.email || undefined,
          source: o.source || o.nguon || 'import',
          goal: o.goal || o.muc_tieu || undefined,
          notes: o.notes || o.ghi_chu || undefined,
        },
      };
    }));

    res.json({
      total: preview.length,
      valid: preview.filter(p => p.valid).length,
      invalid: preview.filter(p => !p.valid).length,
      preview,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to preview import' });
  }
});

// POST /api/import/leads/commit - Actually create leads from validated rows
router.post('/leads/commit', requirePermission('leads', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv text required' });

    const objects = rowsToObjects(parseCsv(csv));
    const results = { created: 0, skipped: 0, errors: [] as any[] };
    const count = await prisma.lead.count();

    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      const name = o.name || o.ho_ten || o.ten;
      const phone = (o.phone || o.sdt || o.so_dien_thoai || '').replace(/[^\d+]/g, '');

      if (!name || !phone) {
        results.skipped++;
        results.errors.push({ row: i + 2, error: 'Thiếu tên hoặc SĐT' });
        continue;
      }

      const existing = await prisma.lead.findFirst({ where: { phone } });
      if (existing) {
        results.skipped++;
        continue;
      }

      try {
        await prisma.lead.create({
          data: {
            code: `L${String(count + results.created + 1).padStart(6, '0')}`,
            name, phone,
            email: o.email || undefined,
            source: o.source || o.nguon || 'import',
            goal: o.goal || o.muc_tieu || undefined,
            notes: o.notes || o.ghi_chu || undefined,
            status: 'new',
          },
        });
        results.created++;
      } catch (e) {
        results.skipped++;
        results.errors.push({ row: i + 2, error: 'Create failed' });
      }
    }

    await auditLog(req.user!.id, 'import', 'lead', 'bulk', null, { created: results.created, skipped: results.skipped });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

// ==================== IMPORT STUDENTS ====================

// POST /api/import/students/preview
router.post('/students/preview', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv text required' });

    const objects = rowsToObjects(parseCsv(csv));
    const preview = await Promise.all(objects.map(async (o, idx) => {
      const errors: string[] = [];
      const name = o.name || o.ho_ten || o.ten;
      const phone = (o.phone || o.sdt || o.so_dien_thoai || '').replace(/[^\d+]/g, '');

      if (!name) errors.push('Thiếu tên');
      if (!phone) errors.push('Thiếu số điện thoại');

      let duplicate = false;
      if (phone) {
        const existing = await prisma.student.findUnique({ where: { phone } });
        if (existing) {
          duplicate = true;
          errors.push(`Trùng với HV ${existing.code}`);
        }
      }

      return {
        row: idx + 2,
        valid: errors.length === 0,
        duplicate,
        errors,
        data: {
          name, phone,
          email: o.email || undefined,
          birthDate: o.birthdate || o.ngay_sinh || undefined,
          gender: o.gender || o.gioi_tinh || undefined,
          address: o.address || o.dia_chi || undefined,
        },
      };
    }));

    res.json({
      total: preview.length,
      valid: preview.filter(p => p.valid).length,
      invalid: preview.filter(p => !p.valid).length,
      preview,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to preview import' });
  }
});

// POST /api/import/students/commit
router.post('/students/commit', requirePermission('students', 'write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv text required' });

    const objects = rowsToObjects(parseCsv(csv));
    const results = { created: 0, skipped: 0, errors: [] as any[] };
    const count = await prisma.student.count();

    for (let i = 0; i < objects.length; i++) {
      const o = objects[i];
      const name = o.name || o.ho_ten || o.ten;
      const phone = (o.phone || o.sdt || o.so_dien_thoai || '').replace(/[^\d+]/g, '');

      if (!name || !phone) {
        results.skipped++;
        results.errors.push({ row: i + 2, error: 'Thiếu tên hoặc SĐT' });
        continue;
      }

      const existing = await prisma.student.findUnique({ where: { phone } });
      if (existing) {
        results.skipped++;
        continue;
      }

      try {
        const gender = (o.gender || o.gioi_tinh || '').toLowerCase();
        await prisma.student.create({
          data: {
            code: `S${String(count + results.created + 1).padStart(6, '0')}`,
            name, phone,
            email: o.email || undefined,
            birthDate: (o.birthdate || o.ngay_sinh) ? new Date(o.birthdate || o.ngay_sinh) : undefined,
            gender: ['male', 'female', 'other'].includes(gender) ? gender : undefined,
            address: o.address || o.dia_chi || undefined,
            status: 'waiting_class',
          },
        });
        results.created++;
      } catch (e) {
        results.skipped++;
        results.errors.push({ row: i + 2, error: 'Create failed' });
      }
    }

    await auditLog(req.user!.id, 'import', 'student', 'bulk', null, { created: results.created, skipped: results.skipped });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to import students' });
  }
});

export default router;
