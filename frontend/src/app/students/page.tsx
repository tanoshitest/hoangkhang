'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';

interface Enrollment {
  id: string;
  status: string;
  class?: { id: string; code: string };
  course?: { name: string };
}

interface Student {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  enrollments?: Enrollment[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card className="overflow-hidden">
        <CardHeader className="flex-col items-start gap-3">
          <div className="flex w-full items-start justify-between gap-4">
            <div>
              <CardTitle>Danh sách học viên ({filtered.length})</CardTitle>
              <CardDescription>Bấm vào tên học viên để xem hồ sơ chi tiết.</CardDescription>
            </div>
            <Link
              href="/students/new"
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="-ml-1 mr-1.5 h-4 w-4" />
              Thêm học viên
            </Link>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã, SĐT..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <Table>
          <THead>
            <TR>
              <TH className="w-10">#</TH>
              <TH>Mã</TH>
              <TH>Học viên</TH>
              <TH>SĐT</TH>
              <TH>Lớp đang học</TH>
              <TH>Trạng thái</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={6}>Không có học viên nào khớp tìm kiếm.</EmptyRow>
            ) : (
              filtered.map((student, index) => {
                const activeClasses = (student.enrollments || [])
                  .filter((e) => e.status === 'active' && e.class)
                  .map((e) => e.class!);
                return (
                  <TR key={student.id}>
                    <TD className="text-xs text-slate-400">{index + 1}</TD>
                    <TD className="whitespace-nowrap font-mono text-xs text-slate-500">
                      {student.code}
                    </TD>
                    <TD>
                      <Link
                        href={`/students/${student.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {student.name}
                      </Link>
                    </TD>
                    <TD className="whitespace-nowrap">
                      {student.phone || <span className="text-slate-400">—</span>}
                    </TD>
                    <TD>
                      {activeClasses.length === 0 ? (
                        <span className="text-slate-400">Chưa xếp lớp</span>
                      ) : (
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {activeClasses.map((cls) => (
                            <Link
                              key={cls.id}
                              href={`/classes/${cls.id}`}
                              className="text-brand-700 hover:underline"
                            >
                              {cls.code}
                            </Link>
                          ))}
                        </div>
                      )}
                    </TD>
                    <TD>
                      <StatusBadge value={student.status} />
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
