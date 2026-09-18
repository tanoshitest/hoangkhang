'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search, CheckCircle, Clock, Phone } from 'lucide-react';

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

export default function WarningsPage() {
  const router = useRouter();
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      consecutive_absent: 'Vắng liên tiếp',
      low_attendance: 'Điểm danh thấp',
      below_standard: 'Dưới chuẩn',
      no_homework: 'Không làm BTVN',
      dropout_risk: 'Nguy cơ nghỉ',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-red-100 text-red-800',
      processing: 'bg-yellow-100 text-yellow-800',
      contacted: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Mới',
      processing: 'Đang xử lý',
      contacted: 'Đã liên hệ',
      resolved: 'Đã giải quyết',
      closed: 'Đã đóng',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900">Cảnh báo học tập</h1>
            <p className="text-sm text-gray-500">Theo dõi học viên có nguy cơ</p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md py-2 px-3 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="new">Mới</option>
              <option value="processing">Đang xử lý</option>
              <option value="contacted">Đã liên hệ</option>
              <option value="resolved">Đã giải quyết</option>
              <option value="closed">Đã đóng</option>
            </select>
          </div>
        </div>

        {/* Warnings List */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {warnings.map((warning) => (
              <li key={warning.id} className="px-4 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        warning.status === 'resolved' || warning.status === 'closed'
                          ? 'bg-green-100'
                          : 'bg-red-100'
                      }`}>
                        <AlertTriangle className={`h-4 w-4 ${
                          warning.status === 'resolved' || warning.status === 'closed'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`} />
                      </div>
                    </div>
                    <div className="ml-3">
                      <div
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => router.push(`/students/${warning.student.id}`)}
                      >
                        {warning.student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {warning.student.code} • {getTypeLabel(warning.type)}
                      </div>
                      {warning.details && (
                        <div className="text-sm text-gray-600 mt-1">{warning.details}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(warning.createdAt).toLocaleDateString('vi-VN')}
                        {warning.resolvedAt && ` • Giải quyết ${new Date(warning.resolvedAt).toLocaleDateString('vi-VN')}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(warning.status)}`}>
                      {getStatusLabel(warning.status)}
                    </span>
                    {warning.status === 'new' && (
                      <button
                        onClick={() => updateStatus(warning.id, 'processing')}
                        className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                      >
                        Xử lý
                      </button>
                    )}
                    {warning.status === 'processing' && (
                      <button
                        onClick={() => updateStatus(warning.id, 'contacted')}
                        className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Đã liên hệ
                      </button>
                    )}
                    {warning.status === 'contacted' && (
                      <button
                        onClick={() => updateStatus(warning.id, 'resolved')}
                        className="text-xs px-2 py-1 border border-green-300 rounded text-green-700 hover:bg-green-50 flex items-center"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Giải quyết
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {warnings.length === 0 && (
          <div className="text-center py-12 bg-white rounded-md shadow mt-6">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Không có cảnh báo nào</h3>
            <p className="mt-1 text-sm text-gray-500">Tất cả học viên đều ổn.</p>
          </div>
        )}
      </div>
    </div>
  );
}
