import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create roles
  const roles = [
    {
      name: 'admin',
      displayName: 'Quản trị hệ thống',
      description: 'Toàn quyền dữ liệu, quản lý user, role, danh mục, cấu hình',
    },
    {
      name: 'manager',
      displayName: 'Quản lý trung tâm',
      description: 'Xem toàn bộ lead, học viên, lớp và vận hành, xem tài chính',
    },
    {
      name: 'sales',
      displayName: 'Tư vấn tuyển sinh',
      description: 'Tạo/sửa lead, quản lý lead/hồ sơ được phụ trách',
    },
    {
      name: 'academic',
      displayName: 'Đào tạo',
      description: 'Tạo/sửa hồ sơ học viên, quản lý khóa, lớp, lịch, xếp lớp',
    },
    {
      name: 'teacher',
      displayName: 'Giáo viên',
      description: 'Xem lịch dạy, điểm danh, cập nhật nội dung thực dạy',
    },
    {
      name: 'accountant',
      displayName: 'Kế toán',
      description: 'Quản lý học phí, công nợ, giao dịch, hoàn phí/điều chỉnh',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
  }

  console.log('✅ Created 6 roles');

  // Create permissions
  const permissions = [
    // Leads
    { name: 'leads:read', module: 'leads', action: 'read' },
    { name: 'leads:write', module: 'leads', action: 'write' },
    { name: 'leads:delete', module: 'leads', action: 'delete' },
    
    // Students
    { name: 'students:read', module: 'students', action: 'read' },
    { name: 'students:write', module: 'students', action: 'write' },
    { name: 'students:delete', module: 'students', action: 'delete' },
    
    // Courses
    { name: 'courses:read', module: 'courses', action: 'read' },
    { name: 'courses:write', module: 'courses', action: 'write' },
    { name: 'courses:delete', module: 'courses', action: 'delete' },
    
    // Classes
    { name: 'classes:read', module: 'classes', action: 'read' },
    { name: 'classes:write', module: 'classes', action: 'write' },
    { name: 'classes:delete', module: 'classes', action: 'delete' },
    
    // Sessions
    { name: 'sessions:read', module: 'sessions', action: 'read' },
    { name: 'sessions:write', module: 'sessions', action: 'write' },
    { name: 'sessions:delete', module: 'sessions', action: 'delete' },
    
    // Attendance
    { name: 'attendance:read', module: 'attendance', action: 'read' },
    { name: 'attendance:write', module: 'attendance', action: 'write' },
    
    // Finance
    { name: 'finance:read', module: 'finance', action: 'read' },
    { name: 'finance:write', module: 'finance', action: 'write' },
    { name: 'finance:delete', module: 'finance', action: 'delete' },
    
    // Teachers
    { name: 'teachers:read', module: 'teachers', action: 'read' },
    { name: 'teachers:write', module: 'teachers', action: 'write' },
    { name: 'teachers:delete', module: 'teachers', action: 'delete' },
    
    // Reports
    { name: 'reports:read', module: 'reports', action: 'read' },
    { name: 'reports:own', module: 'reports', action: 'own' },
    { name: 'reports:academic', module: 'reports', action: 'academic' },
    { name: 'reports:finance', module: 'reports', action: 'finance' },
    { name: 'reports:assigned', module: 'reports', action: 'assigned' },
    
    // System
    { name: 'system:read', module: 'system', action: 'read' },
    { name: 'system:write', module: 'system', action: 'write' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: permission,
      create: permission,
    });
  }

  console.log('✅ Created permissions');

  // Create admin user
  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  });

  if (!adminRole) {
    throw new Error('Admin role not found');
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@hoangkhang.com' },
    update: {},
    create: {
      email: 'admin@hoangkhang.com',
      password: hashedPassword,
      name: 'Administrator',
      roles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
  });

  console.log('✅ Created admin user: admin@hoangkhang.com / admin123');

  // Create status definitions
  const statusDefinitions = [
    // Lead statuses
    { module: 'lead', status: 'new', displayName: 'Mới', color: '#3B82F6' },
    { module: 'lead', status: 'assigned', displayName: 'Đã phân công', color: '#F59E0B' },
    { module: 'lead', status: 'contacted', displayName: 'Đã liên hệ', color: '#8B5CF6' },
    { module: 'lead', status: 'consulting', displayName: 'Đang tư vấn', color: '#EC4899' },
    { module: 'lead', status: 'test_pending', displayName: 'Chờ kiểm tra', color: '#F97316' },
    { module: 'lead', status: 'trial', displayName: 'Học thử', color: '#06B6D4' },
    { module: 'lead', status: 'decision_pending', displayName: 'Chờ quyết định', color: '#84CC16' },
    { module: 'lead', status: 'registered', displayName: 'Đã đăng ký', color: '#22C55E' },
    { module: 'lead', status: 'not_registered', displayName: 'Không đăng ký', color: '#EF4444' },
    
    // Student statuses
    { module: 'student', status: 'waiting_class', displayName: 'Chờ xếp lớp', color: '#F59E0B' },
    { module: 'student', status: 'studying', displayName: 'Đang học', color: '#22C55E' },
    { module: 'student', status: 'reserved', displayName: 'Bảo lưu', color: '#3B82F6' },
    { module: 'student', status: 'transferred', displayName: 'Chuyển lớp', color: '#8B5CF6' },
    { module: 'student', status: 'dropped', displayName: 'Nghỉ học', color: '#EF4444' },
    { module: 'student', status: 'completed', displayName: 'Hoàn thành', color: '#059669' },
    
    // Class statuses
    { module: 'class', status: 'planned', displayName: 'Dự kiến mở', color: '#6B7280' },
    { module: 'class', status: 'recruiting', displayName: 'Đang tuyển', color: '#3B82F6' },
    { module: 'class', status: 'full', displayName: 'Đã đủ sĩ số', color: '#F59E0B' },
    { module: 'class', status: 'studying', displayName: 'Đang học', color: '#22C55E' },
    { module: 'class', status: 'paused', displayName: 'Tạm dừng', color: '#EF4444' },
    { module: 'class', status: 'finished', displayName: 'Đã kết thúc', color: '#6B7280' },
    
    // Session statuses
    { module: 'session', status: 'planned', displayName: 'Dự kiến', color: '#6B7280' },
    { module: 'session', status: 'taught', displayName: 'Đã dạy', color: '#22C55E' },
    { module: 'session', status: 'absent', displayName: 'Nghỉ', color: '#EF4444' },
    { module: 'session', status: 'makeup', displayName: 'Dạy bù', color: '#F59E0B' },
    { module: 'session', status: 'rescheduled', displayName: 'Đổi lịch', color: '#3B82F6' },
    { module: 'session', status: 'teacher_changed', displayName: 'Đổi giáo viên', color: '#8B5CF6' },
    
    // Payment statuses
    { module: 'payment', status: 'pending', displayName: 'Chờ xác nhận', color: '#F59E0B' },
    { module: 'payment', status: 'confirmed', displayName: 'Đã xác nhận', color: '#22C55E' },
    { module: 'payment', status: 'cancelled', displayName: 'Đã hủy', color: '#EF4444' },
    
    // Warning statuses
    { module: 'warning', status: 'new', displayName: 'Mới', color: '#EF4444' },
    { module: 'warning', status: 'processing', displayName: 'Đang xử lý', color: '#F59E0B' },
    { module: 'warning', status: 'contacted', displayName: 'Đã liên hệ', color: '#3B82F6' },
    { module: 'warning', status: 'resolved', displayName: 'Đã giải quyết', color: '#22C55E' },
    { module: 'warning', status: 'closed', displayName: 'Đóng cảnh báo', color: '#6B7280' },
  ];

  for (const status of statusDefinitions) {
    await prisma.statusDefinition.create({
      data: status,
    });
  }

  console.log('✅ Created status definitions');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
