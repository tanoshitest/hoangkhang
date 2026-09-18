'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Phone, Mail, MapPin, Calendar, BookOpen, Target, Clock, AlertCircle } from 'lucide-react';

export default function CreateLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    zalo: '',
    birthYear: '',
    province: '',
    educationLevel: '',
    goal: '',
    japanProgram: '',
    availableTime: '',
    source: '',
    interestedCourse: '',
    expectedClass: '',
    notes: '',
  });
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Check for duplicates when phone or email changes
    if (name === 'phone' || name === 'email') {
      checkDuplicates(value);
    }
  };

  const checkDuplicates = async (value: string) => {
    if (!value) {
      setDuplicateWarning('');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const existingLead = data.data.find((lead: any) => 
          lead.phone === value || lead.email === value
        );

        if (existingLead) {
          setDuplicateWarning(`Lead đã tồn tại: ${existingLead.name} (${existingLead.code})`);
        } else {
          setDuplicateWarning('');
        }
      }
    } catch (error) {
      console.error('Failed to check duplicates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = Object.fromEntries(
        Object.entries({ ...formData, birthYear: formData.birthYear ? parseInt(formData.birthYear) : undefined })
          .map(([k, v]) => [k, v === '' ? undefined : v])
      );
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push('/leads');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create lead');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const sources = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'website', label: 'Website' },
    { value: 'ads', label: 'Quảng cáo' },
    { value: 'referral', label: 'Giới thiệu' },
    { value: 'teacher', label: 'Giáo viên' },
    { value: 'other', label: 'Khác' },
  ];

  const educationLevels = [
    { value: 'beginner', label: 'Mới bắt đầu' },
    { value: 'n5', label: 'N5' },
    { value: 'n4', label: 'N4' },
    { value: 'n3', label: 'N3' },
    { value: 'n2', label: 'N2' },
    { value: 'n1', label: 'N1' },
  ];

  const japanPrograms = [
    { value: 'duhoc', label: 'Du học' },
    { value: 'xuatkhauld', label: 'Xuất khẩu lao động' },
    { value: 'ky_nang_dac_dinh', label: 'Kỹ năng đặc định' },
    { value: 'thuc_tap_sinh', label: 'Thực tập sinh' },
    { value: 'khac', label: 'Khác' },
  ];

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/leads')}
              className="mr-4 p-2 text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Thêm Lead mới</h1>
              <p className="text-sm text-slate-500">Tạo hồ sơ khách hàng tiềm năng</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border border-slate-200 shadow-sm sm:rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Cảnh báo trùng lặp</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      {duplicateWarning}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <User className="mr-2 h-5 w-5" />
                Thông tin cơ bản
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Họ tên *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Điện thoại *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Zalo
                  </label>
                  <input
                    type="text"
                    name="zalo"
                    value={formData.zalo}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Năm sinh
                  </label>
                  <input
                    type="number"
                    name="birthYear"
                    value={formData.birthYear}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Tỉnh/thành
                  </label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>
            </div>

            {/* Education & Goals */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Học vấn & Mục tiêu
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Trình độ quan tâm
                  </label>
                  <select
                    name="educationLevel"
                    value={formData.educationLevel}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="">Chọn trình độ</option>
                    {educationLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Mục tiêu học
                  </label>
                  <input
                    type="text"
                    name="goal"
                    value={formData.goal}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Chương trình đi Nhật
                  </label>
                  <select
                    name="japanProgram"
                    value={formData.japanProgram}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="">Chọn chương trình</option>
                    {japanPrograms.map(program => (
                      <option key={program.value} value={program.value}>
                        {program.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Lịch có thể học
                  </label>
                  <input
                    type="text"
                    name="availableTime"
                    value={formData.availableTime}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Tối 2-4-6, Sáng 3-5-7"
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>
            </div>

            {/* Marketing & Assignment */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Marketing & Phân công
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Nguồn khách *
                  </label>
                  <select
                    name="source"
                    required
                    value={formData.source}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="">Chọn nguồn</option>
                    {sources.map(source => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Khóa quan tâm
                  </label>
                  <input
                    type="text"
                    name="interestedCourse"
                    value={formData.interestedCourse}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Lớp dự kiến
                  </label>
                  <input
                    type="text"
                    name="expectedClass"
                    value={formData.expectedClass}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Ghi chú
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                placeholder="Ghi chú thêm về lead..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/leads')}
                className="px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
              >
                <Save className="-ml-1 mr-2 h-4 w-4" />
                {loading ? 'Đang lưu...' : 'Lưu Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
