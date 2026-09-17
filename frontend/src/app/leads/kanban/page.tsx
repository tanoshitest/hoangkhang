'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, MoreHorizontal } from 'lucide-react';

interface Lead {
  id: string;
  code: string;
  name: string;
  phone: string;
  status: string;
  assignedTo?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color: string;
  leads: Lead[];
}

const columnDefinitions = [
  { id: 'new', title: 'Mới', status: 'new', color: 'bg-blue-500' },
  { id: 'assigned', title: 'Đã phân công', status: 'assigned', color: 'bg-yellow-500' },
  { id: 'contacted', title: 'Đã liên hệ', status: 'contacted', color: 'bg-purple-500' },
  { id: 'consulting', title: 'Đang tư vấn', status: 'consulting', color: 'bg-pink-500' },
  { id: 'test_pending', title: 'Chờ kiểm tra', status: 'test_pending', color: 'bg-orange-500' },
  { id: 'trial', title: 'Học thử', status: 'trial', color: 'bg-cyan-500' },
  { id: 'decision_pending', title: 'Chờ quyết định', status: 'decision_pending', color: 'bg-green-500' },
  { id: 'registered', title: 'Đã đăng ký', status: 'registered', color: 'bg-green-600' },
  { id: 'not_registered', title: 'Không đăng ký', status: 'not_registered', color: 'bg-red-500' },
];

export default function LeadKanbanPage() {
  const router = useRouter();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        organizeKanbanColumns(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeKanbanColumns = (leads: Lead[]) => {

    const columns = columnDefinitions.map(col => ({
      ...col,
      leads: leads.filter(lead => lead.status === col.status)
    }));

    setColumns(columns);
  };

  const handleLeadClick = (leadId: string) => {
    router.push(`/leads/${leadId}`);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchLeads(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to update lead status:', error);
    }
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/leads')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Kanban Board</h1>
                <p className="text-sm text-gray-500">Quản lý lead theo pipeline</p>
              </div>
            </div>
            <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Thêm Lead
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto">
          <div className="flex space-x-6 min-w-max pb-6">
            {columns.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-80">
                <div className="bg-gray-50 rounded-lg">
                  {/* Column Header */}
                  <div className={`px-4 py-3 ${column.color} text-white rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">{column.title}</h3>
                      <span className="text-sm font-medium bg-white bg-opacity-20 px-2 py-1 rounded">
                        {column.leads.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Content */}
                  <div className="p-4 space-y-3 min-h-96">
                    {column.leads.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-400 text-sm">Không có lead nào</div>
                      </div>
                    ) : (
                      column.leads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleLeadClick(lead.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">{lead.name}</h4>
                              <p className="text-xs text-gray-500 mt-1">{lead.code}</p>
                              <p className="text-xs text-gray-500">{lead.phone}</p>
                              {lead.assignedTo && (
                                <p className="text-xs text-gray-600 mt-2">
                                  👤 {lead.assignedTo.name}
                                </p>
                              )}
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {new Date(lead.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {columnDefinitions.map(col => (
                                <option key={col.status} value={col.status}>
                                  {col.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
