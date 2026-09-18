'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Phone } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';

interface Warning {
  id: string;
  type: string;
  status: string;
  details?: string;
  createdAt: string;
  resolvedAt?: string;
  student: {
    id: string;
    code: string;
    name: string;
    phone: string;
  };
}

const TYPE_LABELS: Record<string, string> = {
  consecutive_absent: 'Vắng liên tiếp',
  low_attendance: 'Điểm danh thấp',
  below_standard: 'Dưới chuẩn',
  no_homework: 'Không làm BTVN',
  dropout_risk: 'Nguy cơ nghỉ',
};

const STATUS_CFG: Record<string, { label: string; tone: Tone }> = {
  new: { label: 'Mới', tone: 'red' },
  processing: { label: 'Đang xử lý', tone: 'amber' },
  contacted: { label: 'Đã liên hệ', tone: 'brand' },
  resolved: { label: 'Đã giải quyết', tone: 'green' },
  closed: { label: 'Đã đóng', tone: 'slate' },
};

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchWarnings();
  }, [statusFilter]);

  const fetchWarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = statusFilter
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/warnings?status=${statusFilter}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/warnings`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) setWarnings((await response.json()).data);
    } catch (error) {
      console.error('Failed to fetch warnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/warnings/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchWarnings();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <Card className="overflow-hidden">
          <CardHeader className="flex-col items-start gap-3">
            <div className="flex w-full items-start justify-between gap-4">
              <div>
                <CardTitle>Danh sách cảnh báo ({warnings.length})</CardTitle>
                <CardDescription>Học viên cần chăm sóc — bấm vào tên để xem hồ sơ.</CardDescription>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg py-2 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="new">Mới</option>
                <option value="processing">Đang xử lý</option>
                <option value="contacted">Đã liên hệ</option>
                <option value="resolved">Đã giải quyết</option>
                <option value="closed">Đã đóng</option>
              </select>
            </div>
          </CardHeader>

          <Table>
            <THead>
              <TR>
                <TH className="w-10">#</TH>
                <TH>Học viên</TH>
                <TH>Loại cảnh báo</TH>
                <TH>Chi tiết</TH>
                <TH>Ngày tạo</TH>
                <TH>Trạng thái</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {warnings.length === 0 ? (
                <EmptyRow colSpan={7}>Không có cảnh báo nào — tất cả học viên đều ổn.</EmptyRow>
              ) : (
                warnings.map((warning, index) => {
                  const status = STATUS_CFG[warning.status] || { label: warning.status, tone: 'slate' as Tone };
                  return (
                    <TR key={warning.id}>
                      <TD className="text-xs text-slate-400">{index + 1}</TD>
                      <TD>
                        <Link
                          href={`/students/${warning.student.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {warning.student.name}
                        </Link>
                        <div className="font-mono text-xs text-slate-500">{warning.student.code}</div>
                      </TD>
                      <TD className="whitespace-nowrap">{TYPE_LABELS[warning.type] || warning.type}</TD>
                      <TD className="max-w-xs">
                        <span className="line-clamp-2 text-slate-600">{warning.details || '—'}</span>
                      </TD>
                      <TD className="whitespace-nowrap text-slate-500">
                        {new Date(warning.createdAt).toLocaleDateString('vi-VN')}
                        {warning.resolvedAt && (
                          <div className="text-xs text-slate-400">
                            Giải quyết {new Date(warning.resolvedAt).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </TD>
                      <TD>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </TD>
                      <TD className="w-px whitespace-nowrap text-right">
                        {warning.status === 'new' && (
                          <button
                            onClick={() => updateStatus(warning.id, 'processing')}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200"
                          >
                            Xử lý
                          </button>
                        )}
                        {warning.status === 'processing' && (
                          <button
                            onClick={() => updateStatus(warning.id, 'contacted')}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200"
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Đã liên hệ
                          </button>
                        )}
                        {warning.status === 'contacted' && (
                          <button
                            onClick={() => updateStatus(warning.id, 'resolved')}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Giải quyết
                          </button>
                        )}
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
