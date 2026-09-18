'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, MoreHorizontal, GripVertical } from 'lucide-react';

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
  { id: 'new', title: 'Mới', status: 'new', color: 'bg-brand-500' },
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
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    organizeKanbanColumns(allLeads);
  }, [allLeads]);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads?limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllLeads(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeKanbanColumns = (leads: Lead[]) => {
    const cols = columnDefinitions.map(col => ({
      ...col,
      leads: leads.filter(lead => lead.status === col.status)
    }));
    setColumns(cols);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // Optimistic update
    setAllLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        fetchLeads(); // Revert on failure
      }
    } catch (error) {
      console.error('Failed to update lead status:', error);
      fetchLeads();
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      const lead = allLeads.find(l => l.id === leadId);
      if (lead && lead.status !== columnStatus) {
        handleStatusChange(leadId, columnStatus);
      }
    }
    setDraggedLeadId(null);
    setDragOverColumn(null);
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/leads')}
                className="mr-4 p-2 text-slate-400 hover:text-slate-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Bảng Kanban</h1>
                <p className="text-sm text-slate-500">Kéo thả để chuyển trạng thái khách hàng</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/leads/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Thêm KH tiềm năng
            </button>
          </div>
        </div>

        {/* Bảng Kanban */}
        <div className="overflow-x-auto">
          <div className="flex space-x-4 min-w-max pb-6">
            {columns.map((column) => (
              <div key={column.id} className="flex-shrink-0 w-72">
                <div className="bg-slate-50 rounded-lg">
                  {/* Column Header */}
                  <div className={`px-4 py-3 ${column.color} text-white rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">{column.title}</h3>
                      <span className="text-sm font-medium bg-white bg-opacity-20 px-2 py-1 rounded">
                        {column.leads.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Content - Drop Zone */}
                  <div
                    className={`p-3 space-y-3 min-h-96 transition-colors ${
                      dragOverColumn === column.status ? 'bg-brand-50 ring-2 ring-brand-300 ring-inset' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, column.status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, column.status)}
                  >
                    {column.leads.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                        <div className="text-slate-400 text-sm">Thả khách hàng vào đây</div>
                      </div>
                    ) : (
                      column.leads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-xl border border-slate-200 shadow-sm p-3 cursor-grab hover:shadow-md transition-all ${
                            draggedLeadId === lead.id ? 'opacity-40 rotate-2' : ''
                          }`}
                          onClick={() => router.push(`/leads/${lead.id}`)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <GripVertical className="h-3 w-3 text-slate-300 mr-1 flex-shrink-0" />
                                <h4 className="text-sm font-medium text-slate-900">{lead.name}</h4>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{lead.code}</p>
                              <p className="text-xs text-slate-500">{lead.phone}</p>
                              {lead.assignedTo && (
                                <p className="text-xs text-slate-600 mt-2">
                                  {lead.assignedTo.name}
                                </p>
                              )}
                            </div>
                            <button
                              className="text-slate-400 hover:text-slate-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              {new Date(lead.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs border border-slate-300 rounded px-1.5 py-0.5"
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
