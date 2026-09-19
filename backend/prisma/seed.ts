import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ==================== ROLES ====================
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
      name: 'sales_leader',
      displayName: 'Trưởng phòng sale',
      description: 'Duyệt cấp 1: chương trình ưu đãi, xóa data, ghi nợ đặc biệt',
    },
    {
      name: 'academic',
      displayName: 'Đào tạo',
      description: 'Tạo/sửa hồ sơ học viên, quản lý khóa, lớp, lịch, xếp lớp',
    },
    {
      name: 'teacher',
      displayName: 'Giáo viên',
      description: 'Portal GV: xem lớp phụ trách, điểm danh, nhập điểm, nhập giờ dạy',
    },
    {
      name: 'accountant',
      displayName: 'Kế toán',
      description: 'Quản lý học phí, công nợ, giao dịch, hoàn phí/điều chỉnh',
    },
    {
      name: 'student',
      displayName: 'Học viên',
      description: 'Portal HV: đăng nhập Google, xem lịch/điểm/phiếu thu/tài liệu, chat',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
  }

  console.log('✅ Created 8 roles');

  // ==================== PERMISSIONS ====================
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

    // Approvals (duyệt 2 cấp)
    { name: 'approvals:read', module: 'approvals', action: 'read' },
    { name: 'approvals:write', module: 'approvals', action: 'write' },
    { name: 'approvals:level1', module: 'approvals', action: 'level1' },
    { name: 'approvals:level2', module: 'approvals', action: 'level2' },

    // Commissions
    { name: 'commissions:read', module: 'commissions', action: 'read' },
    { name: 'commissions:write', module: 'commissions', action: 'write' },

    // Chat
    { name: 'chat:use', module: 'chat', action: 'use' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: permission,
      create: permission,
    });
  }

  console.log('✅ Created permissions');

  // ==================== ADMIN USER ====================
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

  // ==================== STATUS DEFINITIONS + DANH MỤC ====================
  // DANH_MUC sheet -> status_definitions (module = lookup category)
  const statusDefinitions = [
    // Lead statuses — spec Q40 (8 trạng thái)
    { module: 'lead', status: 'new', displayName: 'Mới', color: '#3B82F6', sortOrder: 1 },
    { module: 'lead', status: 'contacted', displayName: 'Đã liên hệ', color: '#8B5CF6', sortOrder: 2 },
    { module: 'lead', status: 'test_scheduled', displayName: 'Hẹn test đầu vào', color: '#F97316', sortOrder: 3 },
    { module: 'lead', status: 'tested', displayName: 'Đã test đầu vào', color: '#06B6D4', sortOrder: 4 },
    { module: 'lead', status: 'thinking', displayName: 'Cần suy nghĩ thêm', color: '#84CC16', sortOrder: 5 },
    { module: 'lead', status: 'nurturing', displayName: 'Cần chăm sóc thường xuyên', color: '#EC4899', sortOrder: 6 },
    { module: 'lead', status: 'not_potential', displayName: 'Không tiềm năng', color: '#EF4444', sortOrder: 7 },
    { module: 'lead', status: 'enrolled', displayName: 'Đã ghi danh', color: '#22C55E', sortOrder: 8 },

    // Lead sources — DANH_MUC
    { module: 'lead_source', status: 'facebook', displayName: 'Facebook', sortOrder: 1 },
    { module: 'lead_source', status: 'zalo', displayName: 'Zalo', sortOrder: 2 },
    { module: 'lead_source', status: 'tiktok', displayName: 'TikTok', sortOrder: 3 },
    { module: 'lead_source', status: 'website', displayName: 'Website', sortOrder: 4 },
    { module: 'lead_source', status: 'youtube', displayName: 'YouTube', sortOrder: 5 },
    { module: 'lead_source', status: 'referral', displayName: 'Giới thiệu (HV/CTV)', sortOrder: 6 },
    { module: 'lead_source', status: 'ads', displayName: 'Quảng cáo trả phí', sortOrder: 7 },
    { module: 'lead_source', status: 'other', displayName: 'Khác', sortOrder: 8 },

    // Lead types — DANH_MUC (drives commission)
    { module: 'lead_type', status: 'center', displayName: 'Lead trung tâm', sortOrder: 1 },
    { module: 'lead_type', status: 'self_sourced', displayName: 'Lead sale tự tìm', sortOrder: 2 },
    { module: 'lead_type', status: 'ctv', displayName: 'CTV giới thiệu', sortOrder: 3 },

    // CTV types — DANH_MUC
    { module: 'ctv_type', status: 'none', displayName: 'Không', sortOrder: 1 },
    { module: 'ctv_type', status: 'ctv_enrolled', displayName: 'CTV có đăng ký học', sortOrder: 2 },
    { module: 'ctv_type', status: 'ctv_not_enrolled', displayName: 'CTV không đăng ký học', sortOrder: 3 },

    // Student statuses
    { module: 'student', status: 'waiting_class', displayName: 'Chờ xếp lớp', color: '#F59E0B', sortOrder: 1 },
    { module: 'student', status: 'studying', displayName: 'Đang học', color: '#22C55E', sortOrder: 2 },
    { module: 'student', status: 'reserved', displayName: 'Bảo lưu', color: '#3B82F6', sortOrder: 3 },
    { module: 'student', status: 'transferred', displayName: 'Chuyển lớp', color: '#8B5CF6', sortOrder: 4 },
    { module: 'student', status: 'dropped', displayName: 'Nghỉ học', color: '#EF4444', sortOrder: 5 },
    { module: 'student', status: 'completed', displayName: 'Hoàn thành', color: '#059669', sortOrder: 6 },

    // Enrollment statuses — DANH_MUC "Trạng thái ghi danh"
    { module: 'enrollment', status: 'reserved', displayName: 'Giữ chỗ', color: '#F59E0B', sortOrder: 1 },
    { module: 'enrollment', status: 'studying', displayName: 'Đang học', color: '#22C55E', sortOrder: 2 },
    { module: 'enrollment', status: 'suspended', displayName: 'Bảo lưu', color: '#3B82F6', sortOrder: 3 },
    { module: 'enrollment', status: 'dropped', displayName: 'Nghỉ học', color: '#EF4444', sortOrder: 4 },
    { module: 'enrollment', status: 'completed', displayName: 'Hoàn thành', color: '#059669', sortOrder: 5 },

    // Class statuses
    { module: 'class', status: 'planned', displayName: 'Dự kiến mở', color: '#6B7280', sortOrder: 1 },
    { module: 'class', status: 'recruiting', displayName: 'Đang tuyển', color: '#3B82F6', sortOrder: 2 },
    { module: 'class', status: 'full', displayName: 'Đã đủ sĩ số', color: '#F59E0B', sortOrder: 3 },
    { module: 'class', status: 'studying', displayName: 'Đang học', color: '#22C55E', sortOrder: 4 },
    { module: 'class', status: 'paused', displayName: 'Tạm dừng', color: '#EF4444', sortOrder: 5 },
    { module: 'class', status: 'finished', displayName: 'Đã kết thúc', color: '#6B7280', sortOrder: 6 },

    // Class formats — DANH_MUC "Hình thức lớp"
    { module: 'class_format', status: 'one_on_one', displayName: '1-1', sortOrder: 1 },
    { module: 'class_format', status: 'group', displayName: 'Nhóm', sortOrder: 2 },

    // Shifts — DANH_MUC "Ca dạy" + "Giờ ca"
    { module: 'shift', status: 'morning', displayName: 'Sáng (8g-11g)', sortOrder: 1 },
    { module: 'shift', status: 'afternoon', displayName: 'Chiều (14g-16g)', sortOrder: 2 },
    { module: 'shift', status: 'evening', displayName: 'Tối (19g-21g)', sortOrder: 3 },

    // Price tiers — DANH_MUC "Khung giá nhóm"
    { module: 'price_tier', status: '2-5', displayName: 'Nhóm 2-5 HV', sortOrder: 1 },
    { module: 'price_tier', status: '6-10', displayName: 'Nhóm 6-10 HV', sortOrder: 2 },

    // Session statuses
    { module: 'session', status: 'planned', displayName: 'Dự kiến', color: '#6B7280', sortOrder: 1 },
    { module: 'session', status: 'taught', displayName: 'Đã dạy', color: '#22C55E', sortOrder: 2 },
    { module: 'session', status: 'absent', displayName: 'Nghỉ', color: '#EF4444', sortOrder: 3 },
    { module: 'session', status: 'makeup', displayName: 'Dạy bù', color: '#F59E0B', sortOrder: 4 },
    { module: 'session', status: 'rescheduled', displayName: 'Đổi lịch', color: '#3B82F6', sortOrder: 5 },
    { module: 'session', status: 'teacher_changed', displayName: 'Đổi giáo viên', color: '#8B5CF6', sortOrder: 6 },

    // Attendance — DANH_MUC "Điểm danh"
    { module: 'attendance', status: 'present', displayName: 'Có mặt', color: '#22C55E', sortOrder: 1 },
    { module: 'attendance', status: 'late', displayName: 'Đi muộn', color: '#F59E0B', sortOrder: 2 },
    { module: 'attendance', status: 'excused_absent', displayName: 'Vắng có phép', color: '#3B82F6', sortOrder: 3 },
    { module: 'attendance', status: 'unexcused_absent', displayName: 'Vắng không phép', color: '#EF4444', sortOrder: 4 },
    { module: 'attendance', status: 'early_leave', displayName: 'Về sớm', color: '#F97316', sortOrder: 5 },

    // Assessment types — DANH_MUC "Loại bài đánh giá"
    { module: 'assessment_type', status: 'quizizz', displayName: 'Quizizz', sortOrder: 1 },
    { module: 'assessment_type', status: 'midterm', displayName: 'Giữa khóa', sortOrder: 2 },
    { module: 'assessment_type', status: 'final', displayName: 'Cuối khóa', sortOrder: 3 },
    { module: 'assessment_type', status: 'jlpt_real', displayName: 'JLPT thực tế', sortOrder: 4 },

    // JLPT results — DANH_MUC
    { module: 'jlpt_result', status: 'pass', displayName: 'Đậu', color: '#22C55E', sortOrder: 1 },
    { module: 'jlpt_result', status: 'fail', displayName: 'Rớt', color: '#EF4444', sortOrder: 2 },

    // Payment item types — DANH_MUC "Loại khoản thu"
    { module: 'payment_item', status: 'deposit', displayName: 'Cọc giữ chỗ', sortOrder: 1 },
    { module: 'payment_item', status: 'tuition', displayName: 'Học phí', sortOrder: 2 },
    { module: 'payment_item', status: 'pdf_material', displayName: 'Giáo trình PDF', sortOrder: 3 },
    { module: 'payment_item', status: 'makeup_hours', displayName: 'Học phí giờ bù', sortOrder: 4 },
    { module: 'payment_item', status: 'other', displayName: 'Khác', sortOrder: 5 },

    // Payment methods — DANH_MUC "Phương thức TT"
    { module: 'payment_method', status: 'bank_transfer', displayName: 'Chuyển khoản', sortOrder: 1 },
    { module: 'payment_method', status: 'cash', displayName: 'Tiền mặt', sortOrder: 2 },
    { module: 'payment_method', status: 'e_wallet', displayName: 'Ví điện tử', sortOrder: 3 },

    // Payment statuses
    { module: 'payment', status: 'pending', displayName: 'Chờ xác nhận', color: '#F59E0B', sortOrder: 1 },
    { module: 'payment', status: 'confirmed', displayName: 'Đã xác nhận', color: '#22C55E', sortOrder: 2 },
    { module: 'payment', status: 'cancelled', displayName: 'Đã hủy', color: '#EF4444', sortOrder: 3 },

    // Receivable statuses
    { module: 'receivable', status: 'pending', displayName: 'Chờ thu', color: '#F59E0B', sortOrder: 1 },
    { module: 'receivable', status: 'partial', displayName: 'Thu một phần', color: '#3B82F6', sortOrder: 2 },
    { module: 'receivable', status: 'paid', displayName: 'Đã thu đủ', color: '#22C55E', sortOrder: 3 },
    { module: 'receivable', status: 'overdue', displayName: 'Quá hạn', color: '#EF4444', sortOrder: 4 },
    { module: 'receivable', status: 'cancelled', displayName: 'Đã hủy', color: '#6B7280', sortOrder: 5 },

    // Teacher employment status — DANH_MUC "Trạng thái GV"
    { module: 'teacher_status', status: 'probation', displayName: 'Thử việc', sortOrder: 1 },
    { module: 'teacher_status', status: 'official', displayName: 'Chính thức', sortOrder: 2 },

    // Price levels — DANH_MUC "Level giá" (drives DON_GIA_GV + payroll)
    { module: 'price_level', status: 'N5-N4', displayName: 'N5-N4', sortOrder: 1 },
    { module: 'price_level', status: 'N3', displayName: 'N3', sortOrder: 2 },
    { module: 'price_level', status: 'N2', displayName: 'N2', sortOrder: 3 },
    { module: 'price_level', status: 'BJT', displayName: 'BJT', sortOrder: 4 },

    // Approval types — DANH_MUC "Loại việc cần duyệt"
    { module: 'approval_type', status: 'promotion', displayName: 'Chương trình ưu đãi', sortOrder: 1 },
    { module: 'approval_type', status: 'data_delete', displayName: 'Xóa data', sortOrder: 2 },
    { module: 'approval_type', status: 'special_discount', displayName: 'Ghi nợ / giảm giá đặc biệt', sortOrder: 3 },

    // Approval statuses — DANH_MUC "Duyệt"
    { module: 'approval', status: 'pending', displayName: 'Chờ duyệt', color: '#F59E0B', sortOrder: 1 },
    { module: 'approval', status: 'level1_approved', displayName: 'Đã duyệt cấp 1', color: '#3B82F6', sortOrder: 2 },
    { module: 'approval', status: 'approved', displayName: 'Đã duyệt', color: '#22C55E', sortOrder: 3 },
    { module: 'approval', status: 'rejected', displayName: 'Từ chối', color: '#EF4444', sortOrder: 4 },

    // Commission statuses
    { module: 'commission', status: 'pending', displayName: 'Chưa đủ điều kiện', color: '#F59E0B', sortOrder: 1 },
    { module: 'commission', status: 'eligible', displayName: 'Đủ điều kiện chi', color: '#3B82F6', sortOrder: 2 },
    { module: 'commission', status: 'paid', displayName: 'Đã chi', color: '#22C55E', sortOrder: 3 },
    { module: 'commission', status: 'clawed_back', displayName: 'Đã thu hồi', color: '#EF4444', sortOrder: 4 },

    // Warning statuses
    { module: 'warning', status: 'new', displayName: 'Mới', color: '#EF4444', sortOrder: 1 },
    { module: 'warning', status: 'processing', displayName: 'Đang xử lý', color: '#F59E0B', sortOrder: 2 },
    { module: 'warning', status: 'contacted', displayName: 'Đã liên hệ', color: '#3B82F6', sortOrder: 3 },
    { module: 'warning', status: 'resolved', displayName: 'Đã giải quyết', color: '#22C55E', sortOrder: 4 },
    { module: 'warning', status: 'closed', displayName: 'Đóng cảnh báo', color: '#6B7280', sortOrder: 5 },
  ];

  for (const status of statusDefinitions) {
    await prisma.statusDefinition.upsert({
      where: { module_status: { module: status.module, status: status.status } },
      update: { displayName: status.displayName, color: status.color, sortOrder: status.sortOrder, isActive: true },
      create: status,
    });
  }

  // Deactivate legacy lead statuses replaced by spec Q40
  const legacyLeadStatuses = ['assigned', 'consulting', 'test_pending', 'trial', 'decision_pending', 'registered', 'not_registered'];
  await prisma.statusDefinition.updateMany({
    where: { module: 'lead', status: { in: legacyLeadStatuses } },
    data: { isActive: false },
  });

  console.log('✅ Created status definitions & danh mục');

  // ==================== COURSES (KHOA_HOC — 9 khóa) ====================
  const courses = [
    { code: 'NM', name: 'Nhập môn tiếng Nhật', courseGroup: 'nhap_mon', priceLevel: 'N5-N4', level: 'N5', hoursOneOnOne: 20, hoursGroup: 20, blockHours: 20, priceOneOnOne: 250000, priceGroup2to5: 220000, priceGroup6to10: 150000, totalHours: 20, standardFee: 4400000 },
    { code: 'NT54', name: 'Kiến thức nền tảng N5–N4', courseGroup: 'nen_tang', priceLevel: 'N5-N4', level: 'N5-N4', hoursOneOnOne: 120, hoursGroup: 150, blockHours: 50, priceOneOnOne: 250000, priceGroup2to5: 220000, priceGroup6to10: 150000, totalHours: 150, standardFee: 33000000 },
    { code: 'NT3', name: 'Kiến thức nền tảng N3', courseGroup: 'nen_tang', priceLevel: 'N3', level: 'N3', hoursOneOnOne: 200, hoursGroup: 250, blockHours: 50, priceOneOnOne: 280000, priceGroup2to5: 250000, priceGroup6to10: 200000, totalHours: 250, standardFee: 62500000 },
    { code: 'NT2', name: 'Kiến thức nền tảng N2', courseGroup: 'nen_tang', priceLevel: 'N2', level: 'N2', hoursOneOnOne: 200, hoursGroup: 250, blockHours: 50, priceOneOnOne: 350000, priceGroup2to5: 300000, priceGroup6to10: 250000, totalHours: 250, standardFee: 75000000 },
    { code: 'LT54', name: 'Luyện thi N5–N4', courseGroup: 'luyen_thi', priceLevel: 'N5-N4', level: 'N5-N4', hoursOneOnOne: 40, hoursGroup: 40, blockHours: 20, priceOneOnOne: 250000, priceGroup2to5: 220000, priceGroup6to10: 150000, totalHours: 40, standardFee: 8800000 },
    { code: 'LT3', name: 'Luyện thi N3', courseGroup: 'luyen_thi', priceLevel: 'N3', level: 'N3', hoursOneOnOne: 80, hoursGroup: 80, blockHours: 20, priceOneOnOne: 280000, priceGroup2to5: 250000, priceGroup6to10: 200000, totalHours: 80, standardFee: 20000000 },
    { code: 'LT2', name: 'Luyện thi N2', courseGroup: 'luyen_thi', priceLevel: 'N2', level: 'N2', hoursOneOnOne: 80, hoursGroup: 80, blockHours: 20, priceOneOnOne: 350000, priceGroup2to5: 300000, priceGroup6to10: 250000, totalHours: 80, standardFee: 24000000 },
    { code: 'BJT-NT', name: 'Kiến thức nền tảng BJT', courseGroup: 'bjt', priceLevel: 'BJT', level: 'BJT', hoursOneOnOne: 60, hoursGroup: 60, blockHours: 30, priceOneOnOne: 350000, priceGroup2to5: 350000, priceGroup6to10: 350000, totalHours: 60, standardFee: 21000000 },
    { code: 'BJT-LT', name: 'Luyện thi BJT', courseGroup: 'bjt', priceLevel: 'BJT', level: 'BJT', hoursOneOnOne: 60, hoursGroup: 60, blockHours: 30, priceOneOnOne: 300000, priceGroup2to5: 300000, priceGroup6to10: 300000, totalHours: 60, standardFee: 18000000 },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { code: course.code },
      update: course,
      create: course,
    });
  }

  console.log('✅ Created 9 courses (KHOA_HOC)');

  // ==================== SETTINGS (THAM_SO) ====================
  const settings = [
    { key: 'deposit_amount', value: '500000', type: 'number', description: 'Phí giữ chỗ / cọc (VNĐ) — trừ vào học phí, không hoàn (Q16)' },
    { key: 'discount_full_course', value: '0.20', type: 'number', description: 'Lớp nhóm đóng full khóa: giảm (Q15)' },
    { key: 'discount_relative', value: '0.05', type: 'number', description: 'Người thân/bạn bè học cùng: giảm — chỉ lớp nhóm (Q15)' },
    { key: 'discount_ctv_enrolled', value: '0.10', type: 'number', description: 'CTV giới thiệu và có đăng ký học: giảm cho CTV — chỉ lớp nhóm (Q15)' },
    { key: 'commission_ctv_not_enrolled', value: '0.05', type: 'number', description: 'CTV giới thiệu không học: hoa hồng / học phí 1 HV (Q15)' },
    { key: 'commission_center_lead', value: '0.05', type: 'number', description: 'HH sale — lead trung tâm cấp (gồm lead CTV), trên học phí sau giảm, chi khi đóng đủ 100% (Q31,33)' },
    { key: 'commission_self_sourced', value: '0.10', type: 'number', description: 'HH sale — lead sale tự tìm (Q33)' },
    { key: 'bonus_retention', value: '500000', type: 'number', description: 'Thưởng GV giữ sĩ số lên lớp trên (VNĐ/lớp) — chia đều GV chính (Q26)' },
    { key: 'bonus_jlpt_pass', value: '200000', type: 'number', description: 'Thưởng GV có học viên đậu JLPT (VNĐ/HV) (Q26)' },
    { key: 'bonus_teacher_referral_pct', value: '0.05', type: 'number', description: 'Thưởng GV giới thiệu học viên mới (% học phí khóa) (Q26)' },
    { key: 'excused_absence_per_month', value: '2', type: 'number', description: 'Số lần nghỉ có phép / tháng dương lịch (Q19)' },
    { key: 'absence_notice_hours', value: '24', type: 'number', description: 'Báo nghỉ trước tối thiểu (giờ) — ít hơn vẫn tính 1 buổi (Q19)' },
    { key: 'absence_warning_count', value: '2', type: 'number', description: 'Cảnh báo khi vắng từ (buổi), cộng dồn (Q46)' },
    { key: 'lead_dead_days', value: '90', type: 'number', description: 'Lead chết: số ngày không tương tác sau khi Không tiềm năng (Q41)' },
    { key: 'group_min_students', value: '2', type: 'number', description: 'Sĩ số tối thiểu mở lớp nhóm (Q4)' },
    { key: 'group_max_students', value: '10', type: 'number', description: 'Sĩ số tối đa lớp nhóm (Q4)' },
    { key: 'tier_2_5_max', value: '5', type: 'number', description: 'Khung giá 2-5 áp dụng khi sĩ số tối đa (Q8)' },
    { key: 'reserve_months', value: '3', type: 'number', description: 'Thời hạn bảo lưu (tháng) — quá hạn mất học phí (Q17)' },
    { key: 'sale_target_new_students', value: '5', type: 'number', description: 'Target sale: số HV mới / tháng, năm đầu (Q36)' },
    { key: 'clawback_suspend_count', value: '3', type: 'number', description: 'Số HV bảo lưu của 1 sale để cảnh báo thu hồi HH (Q35)' },
    { key: 'discount_cap', value: '0.20', type: 'number', description: 'Trần tổng % giảm cộng dồn (Q15)' },
    { key: 'pass_threshold', value: '0.60', type: 'number', description: 'Ngưỡng đạt bài kiểm tra giữa/cuối khóa' },
    { key: 'lead_care_cycle_days', value: '7', type: 'number', description: 'Chu kỳ nhắc chăm sóc lead "Cần chăm sóc thường xuyên" (ngày)' },
    { key: 'group_payroll_floor_ratio', value: '0.15', type: 'number', description: 'Lương GV lớp nhóm: tỷ lệ sàn trên doanh thu ghi nhận (Q22)' },
    { key: 'group_payroll_extra_per_student', value: '0.02', type: 'number', description: 'Lương GV lớp nhóm: +2%/HV vượt sĩ số tối thiểu (Q22)' },
    { key: 'main_teachers_per_class', value: '2', type: 'number', description: 'Số GV chính chia đều thưởng giữ sĩ số (Q10, Q26)' },
    { key: 'receipt_prefix', value: 'PT', type: 'string', description: 'Tiền tố số phiếu thu (PT0001...)' },
    { key: 'pdf_material_price', value: '0', type: 'number', description: 'Giá giáo trình PDF mặc định (VNĐ) — chỉnh theo khóa' },
    { key: 'reminder_enabled', value: '1', type: 'number', description: 'Bật nhắc việc tự động (0=tắt) — quét mỗi giờ' },
    { key: 'session_remind_hours', value: '24', type: 'number', description: 'Nhắc buổi học trước (giờ) cho GV/HV — 0=tắt rule này' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { type: setting.type, description: setting.description },
      create: setting,
    });
  }

  console.log('✅ Created 28 settings (THAM_SO)');

  // ==================== TEACHER RATES (DON_GIA_GV placeholders) ====================
  // Spec: trung tâm tự nhập đơn giá — seed khung level × trạng thái, rate=0
  const rateLevels = ['N5-N4', 'N3', 'N2', 'BJT'];
  const rateStatuses = ['probation', 'official'];
  for (const level of rateLevels) {
    for (const employmentStatus of rateStatuses) {
      const existing = await prisma.teacherRate.findFirst({
        where: { teacherId: null, level, employmentStatus, effectiveTo: null },
      });
      if (!existing) {
        await prisma.teacherRate.create({
          data: {
            teacherId: null,
            level,
            employmentStatus,
            classType: 'one_on_one',
            role: 'main',
            rate: 0,
            effectiveFrom: new Date('2026-01-01'),
          },
        });
      }
    }
  }

  console.log('✅ Created DON_GIA_GV placeholders (8 rows, rate=0 — admin nhập trong Cấu hình)');

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
