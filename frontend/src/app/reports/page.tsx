'use client';

import { BarChart3, Download } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900">Báo cáo</h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              <Download className="-ml-1 mr-2 h-5 w-5" />
              Xuất báo cáo
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-md">
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có báo cáo nào</h3>
            <p className="mt-1 text-sm text-gray-500">
              Xem báo cáo tuyển sinh, học viên, lớp học và tài chính.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
