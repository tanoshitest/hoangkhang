'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Phone, Mail, MapPin, Calendar, BookOpen, Target, Clock, AlertCircle, Users } from 'lucide-react';

export default function CreateStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthDate: '',
    gender: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    educationLevel: '',
    goal: '',
    workSchedule: '',
    supportNeeds: '',
    notes: '',
    referredBy: '',
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const existingStudent = data.data.find((student: any) => 
          student.phone === value || student.email === value
        );

        if (existingStudent) {
          setDuplicateWarning(`Học viên đã tồn tại: ${existingStudent.name} (${existingStudent.code})`);
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
        Object.entries(formData).map(([k, v]) => [k, v === '' ? undefined : v])
      );
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push('/students');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create student');
      }
    } catch (error) {
      alert('Lỗi kết nối mạng');
    } finally {
      setLoading(false);
    }
  };

  const educationLevels = [
    { value: 'beginner', label: 'Mới bắt đầu' },
    { value: 'n5', label: 'N5' },
    { value: 'n4', label: 'N4' },
    { value: 'n3', label: 'N3' },
    { value: 'n2', label: 'N2' },
    { value: 'n1', label: 'N1' },
  ];

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/students')}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
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
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Giới tính
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Liên hệ khẩn cấp
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Tên người liên hệ
                  </label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
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
                    Trình độ đầu vào
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
                    Mục tiêu đầu ra
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
                    Khung giờ làm việc
                  </label>
                  <input
                    type="text"
                    name="workSchedule"
                    value={formData.workSchedule}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Sáng 8-12h, Chiều 13-17h"
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Nhu cầu hỗ trợ
                  </label>
                  <input
                    type="text"
                    name="supportNeeds"
                    value={formData.supportNeeds}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Thông tin bổ sung
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Người giới thiệu
                  </label>
                  <input
                    type="text"
                    name="referredBy"
                    value={formData.referredBy}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Thông tin cần lưu ý
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                placeholder="Ghi chú thêm về học viên..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/students')}
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
                {loading ? 'Đang lưu...' : 'Lưu Học viên'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
