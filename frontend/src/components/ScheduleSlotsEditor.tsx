'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

export interface ScheduleSlot {
  day: number; // 0=CN, 1=T2 ... 6=T7
  startTime: string;
  endTime: string;
  teacherId?: string;
}

interface Teacher {
  id: string;
  name: string;
  code: string;
}

const DAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];

export default function ScheduleSlotsEditor({
  value,
  onChange,
}: {
  value: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
}) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teachers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setTeachers(d.data || []))
      .catch(() => {});
  }, []);

  const update = (i: number, patch: Partial<ScheduleSlot>) => {
    onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  };

  return (
    <div className="space-y-2">
      {value.map((slot, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={slot.day}
            onChange={(e) => update(i, { day: parseInt(e.target.value) })}
            className="border border-slate-300 rounded-lg py-1.5 px-2 text-sm"
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <input
            type="time"
            value={slot.startTime}
            onChange={(e) => update(i, { startTime: e.target.value })}
            className="border border-slate-300 rounded-lg py-1.5 px-2 text-sm"
          />
          <span className="text-slate-400 text-sm">–</span>
          <input
            type="time"
            value={slot.endTime}
            onChange={(e) => update(i, { endTime: e.target.value })}
            className="border border-slate-300 rounded-lg py-1.5 px-2 text-sm"
          />
          <select
            value={slot.teacherId || ''}
            onChange={(e) => update(i, { teacherId: e.target.value || undefined })}
            className="border border-slate-300 rounded-lg py-1.5 px-2 text-sm flex-1 min-w-0"
          >
            <option value="">GV mặc định</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-slate-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { day: 2, startTime: '19:00', endTime: '20:00' }])}
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
      >
        <Plus className="h-4 w-4" /> Thêm buổi/tuần
      </button>
      {value.length > 0 && (
        <p className="text-xs text-slate-500">
          Hệ thống tự tạo buổi học lặp theo lịch này, duy trì trước ~10 tuần (tới ngày kết thúc lớp). Đổi lịch → các buổi chưa diễn ra được cập nhật theo.
        </p>
      )}
    </div>
  );
}
