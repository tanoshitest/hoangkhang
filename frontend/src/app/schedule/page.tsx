'use client';

import { Calendar, Plus } from 'lucide-react';

export default function SchedulePage() {
  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Lịch học</h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Thêm Lịch
            </button>
          </div>
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
