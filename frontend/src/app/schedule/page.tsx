'use client';

import { Calendar, Plus } from 'lucide-react';

export default function SchedulePage() {
  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-end">
          <button className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
            <Plus className="-ml-1 mr-1.5 h-4 w-4" />
            Thêm lịch
          </button>
        </div>

        <div className="mt-8 bg-white border border-slate-200 shadow-sm overflow-hidden sm:rounded-xl">
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">Chưa có lịch học nào</h3>
            <p className="mt-1 text-sm text-slate-500">
              Tạo lịch học cho các lớp đang mở.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
