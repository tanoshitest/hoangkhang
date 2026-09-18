'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, BookOpen } from 'lucide-react';

interface Student {
  id: string;
  code: string;
  name: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  level: string;
}

interface ClassOption {
  id: string;
  code: string;
  courseId: string;
  status: string;
}

export default function NewEnrollmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    classId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const [studentsRes, coursesRes, classesRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students?limit=200`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/classes`, { headers }),
    ]);

    if (studentsRes.ok) {
      const data = await studentsRes.json();
      setStudents(data.data);
    }
    if (coursesRes.ok) {
      const data = await coursesRes.json();
      setCourses(data.data);
    }
    if (classesRes.ok) {
      const data = await classesRes.json();
      setClasses(data.data);
    }
  };

  const filteredClasses = classes.filter(c => c.courseId === formData.courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/students/${formData.studentId}/enroll`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId: formData.courseId,
            classId: formData.classId || undefined,
          }),
        }
      );

      if (response.ok) {
        router.push('/enrollments');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create enrollment');
      }
    } catch (error) {
      alert('Lỗi kết nối mạng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/enrollments')}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm sm:rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Thông tin đăng ký
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Học viên *</label>
                  <select
                    required
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="">Chọn học viên</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Khóa học *</label>
                  <select
                    required
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value, classId: '' })}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="">Chọn khóa học</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Lớp (tùy chọn)</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    disabled={!formData.courseId}
                    className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
                  >
                    <option value="">Chưa xếp lớp</option>
                    {filteredClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.status}</option>
                    ))}
                  </select>
                  {!formData.courseId && (
                    <p className="mt-1 text-xs text-slate-500">Chọn khóa học trước</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/enrollments')}
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
                {loading ? 'Đang lưu...' : 'Đăng ký'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
