'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, AlertCircle } from 'lucide-react';

import { Dialog } from '@/components/ui/modal';
import { buttonClass } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { authHeaders } from '@/lib/utils';
import { dateKey, parseDateParam } from '@/lib/date';
import {
  CalendarBoard,
  CalendarNav,
  CalendarPage,
  calendarRange,
  parseView,
  type CalendarSession,
} from './ui';

interface ApiSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  plannedContent?: string | null;
  class: {
    id: string;
    code: string;
    course?: { name: string } | null;
  };
  teacher?: { id: string; name: string } | null;
}

interface ClassOption {
  id: string;
  code: string;
  course?: { name: string } | null;
}

interface Teacher {
  id: string;
  name: string;
}

function toCalendarSession(s: ApiSession): CalendarSession {
  return {
    id: s.id,
    date: new Date(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    classId: s.class.id,
    classCode: s.class.code,
    className: s.class.code,
    courseName: s.class.course?.name ?? null,
    teacherName: s.teacher?.name ?? null,
    plannedContent: s.plannedContent,
  };
}

const EMPTY_FORM = {
  classId: '',
  date: '',
  startTime: '',
  endTime: '',
  teacherId: '',
  meetingLink: '',
  plannedContent: '',
};

function SessionsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get('view'));
  const date = parseDateParam(searchParams.get('date'));
  const teacherId = searchParams.get('teacher') ?? '';
  const classId = searchParams.get('class') ?? '';
  const { from, to } = calendarRange(view, date);

  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dateKey(date), teacherId, classId]);

  useEffect(() => {
    const headers = authHeaders();
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teachers`, { headers }),
    ]).then(async ([classesRes, teachersRes]) => {
      if (classesRes.ok) setClasses((await classesRes.json()).data);
      if (teachersRes.ok) setTeachers((await teachersRes.json()).data);
    });
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
    });
    if (teacherId) params.set('teacherId', teacherId);
    if (classId) params.set('classId', classId);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions?${params}`, {
      headers: authHeaders(),
    });
    if (res.ok) setSessions(((await res.json()).data as ApiSession[]).map(toCalendarSession));
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: formData.classId,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          teacherId: formData.teacherId,
          meetingLink: formData.meetingLink || undefined,
          plannedContent: formData.plannedContent || undefined,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setShowForm(false);
        setFormData(EMPTY_FORM);
        fetchSessions();
      } else {
        setError(data.detail || data.error || 'Tạo buổi học thất bại');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Giữ lại bộ lọc khi bấm ‹ › hoặc đổi chế độ xem.
  const params: Record<string, string> = {};
  if (teacherId) params.teacher = teacherId;
  if (classId) params.class = classId;

  /** Bộ lọc lịch dạy — chọn xong đổi URL ngay, chọn lại "Tất cả …" là bỏ lọc. */
  const setFilter = (name: 'teacher' | 'class', value: string) => {
    const search = new URLSearchParams({ view, date: dateKey(date), ...params });
    if (value) search.set(name, value);
    else search.delete(name);
    router.push(`/sessions?${search.toString()}`);
  };

  const filterSelectClass = 'h-8 w-auto min-w-[9rem] py-1 text-xs';

  return (
    <CalendarPage>
      <CalendarBoard
        view={view}
        date={date}
        sessions={sessions}
        hrefBase="/sessions"
        loading={loading}
        toolbar={
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1">
              <CalendarNav basePath="/sessions" view={view} date={date} params={params}>
                <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto">
                  <Select
                    value={teacherId}
                    onChange={(e) => setFilter('teacher', e.target.value)}
                    aria-label="Tất cả giáo viên"
                    className={filterSelectClass}
                  >
                    <option value="">Tất cả giáo viên</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                  <Select
                    value={classId}
                    onChange={(e) => setFilter('class', e.target.value)}
                    aria-label="Tất cả lớp"
                    className={filterSelectClass}
                  >
                    <option value="">Tất cả lớp</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}{c.course?.name ? ` — ${c.course.name}` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              </CalendarNav>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className={buttonClass('primary', 'sm')}
            >
              <Plus className="h-4 w-4" />
              Thêm buổi học
            </button>
          </div>
        }
      />

      <Dialog
        title="Thêm buổi học"
        open={showForm}
        onClose={() => setShowForm(false)}
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={buttonClass('outline', 'md')}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="create-session"
              disabled={submitting}
              className={buttonClass('primary', 'md')}
            >
              {submitting ? 'Đang lưu...' : 'Tạo buổi học'}
            </button>
          </>
        }
      >
        <form id="create-session" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Lớp">
              <Select
                required
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              >
                <option value="">Chọn lớp</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}{c.course?.name ? ` — ${c.course.name}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Giáo viên">
              <Select
                required
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              >
                <option value="">Chọn giáo viên</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Ngày học">
              <Input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </Field>
            <Field label="Giờ bắt đầu">
              <Input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </Field>
            <Field label="Giờ kết thúc">
              <Input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Link họp">
              <Input
                type="text"
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              />
            </Field>
            <Field label="Nội dung dự kiến" hint="VD: Bài 5 - Ngữ pháp">
              <Input
                type="text"
                value={formData.plannedContent}
                onChange={(e) => setFormData({ ...formData, plannedContent: e.target.value })}
              />
            </Field>
          </div>

          {error ? (
            <p className="flex items-start gap-1.5 whitespace-pre-line text-xs text-red-600">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </form>
      </Dialog>
    </CalendarPage>
  );
}

export default function SessionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
        </div>
      }
    >
      <SessionsInner />
    </Suspense>
  );
}
