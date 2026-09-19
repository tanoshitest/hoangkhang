/**
 * Migration: xóa data demo + nhập 9 lớp IKI (gia sư online 1-1) từ LMS cũ.
 * Chạy TRONG container backend prod:  node /app/migrate-iki.js
 * Idempotent: xóa sạch entities trước khi tạo — chạy lại được.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Tiết → khung giờ (theo system-config LMS cũ)
const TIET = {
  '1': ['08:00', '09:00'], '1A': ['09:30', '10:30'], '2A': ['10:30', '11:30'],
  '4': ['13:00', '14:00'], '5': ['14:00', '15:00'], '5-6': ['14:00', '16:00'],
  '6': ['15:00', '16:00'], '7': ['18:00', '19:00'], '7B': ['18:30', '19:30'],
  '8': ['19:00', '20:00'], '9': ['20:00', '21:00'],
};

const DOW = { 'T2': 1, 'T3': 2, 'T4': 3, 'T5': 4, 'T6': 5, 'T7': 6, 'CN': 0 };

const TEACHERS = [
  { code: 'GV02', name: 'Phạm Minh Mẫn', coop: 'fulltime' },
  { code: 'GV03', name: 'Lê Trần Đăng Quỳnh', coop: 'fulltime' },
  { code: 'GV04', name: 'Dương Thị Hường', coop: 'fulltime' },
  { code: 'GV05', name: 'Bùi Thị Thu Hiền', coop: 'fulltime' },
  { code: 'GV06', name: 'Hoàng Thị Hạnh', coop: 'parttime' },
  { code: 'GV08', name: 'Nguyễn Tự Trọng', coop: 'fulltime' },
  { code: 'GV09', name: 'Trần Long Châu', coop: 'fulltime' },
  { code: 'GV10', name: 'Nguyễn Thùy Tuyết Oanh', coop: 'fulltime' },
];

const COURSES = [
  { code: 'IKI-NM', name: 'IKI Gia sư Online — Nhập môn', level: 'NM', priceLevel: 'N5-N4', priceOneOnOne: 220000 },
  { code: 'IKI-N5', name: 'IKI Gia sư Online — N5', level: 'N5', priceLevel: 'N5-N4', priceOneOnOne: 200000 },
  { code: 'IKI-N4', name: 'IKI Gia sư Online — N4', level: 'N4', priceLevel: 'N5-N4', priceOneOnOne: 220000 },
  { code: 'IKI-N3', name: 'IKI Gia sư Online — N3', level: 'N3', priceLevel: 'N3', priceOneOnOne: 200000 },
];

// students: name chuẩn từ backup LMS; phone thiếu → placeholder, bổ sung sau
const STUDENTS = [
  { code: 'S000002', name: 'Võ Ngọc Phương Linh', phone: '0900000001', birthDate: '2011-04-06', note: 'IKI08-GO-N3+ (Phương)' },
  { code: 'S000003', name: 'Thùy Dung', phone: '0900000002', note: 'IKI08-GO-N4C — cập nhật họ tên/SĐT' },
  { code: 'S000004', name: 'Phương Linh', phone: '0900000003', note: 'IKI07-GO-NM T2 (PLinh) — cập nhật họ tên/SĐT' },
  { code: 'S000005', name: 'Hoàng Nguyệt Minh', phone: '0433527355', birthDate: '2003-05-15', note: 'IKI06-GO-NM (Nguyệt Minh)' },
  { code: 'S000006', name: 'Tạ Việt Khánh Hà', phone: '0846300410', note: 'IKI05-GO-N5T (Hà)' },
  { code: 'S000007', name: 'Nguyễn Hoàng Sơn', phone: '0900000007', note: 'IKI03-GO-N3T (Sơn)' },
  { code: 'S000008', name: 'Ngô Mỹ Huyền', phone: '0900000008', birthDate: '1998-07-22', note: 'IKI03-GO-N3S (Haley Ngô / Ngô Mỹ Nguyên)' },
  { code: 'S000009', name: 'Lê Thị Ngọc Nữ', phone: '0900000009', note: 'IKI02-GO-N4T1 (Nữ)' },
  { code: 'S000010', name: 'Phan Văn Đát', phone: '0900000010', note: 'IKI02-GO-N4T1 (Đạt)' },
  { code: 'S000011', name: 'MinHuỳnh', phone: '0900000011', note: 'IKI02-GO-N5S2 — cập nhật họ tên/SĐT' },
];

// Lịch dạy = chặng đang học (screenshot LMS 19/09/2026). weekday → [tiết, GV ưu tiên, pool]
const CLASSES = [
  {
    code: 'IKI02-GO-N5S2', name: 'IKI02-GO-N5S2 (MinHuỳnh)', course: 'IKI-N5', fee: 200000,
    start: '2026-01-20', end: '2026-09-19', students: ['S000011'],
    mainTeacher: 'GV05', supportTeacher: 'GV06',
    chStart: null, slots: {}, // chặng 7 kết thúc 18/09 — chờ chặng mới
  },
  {
    code: 'IKI02-GO-N4T1', name: 'IKI02-GO-N4T1 (Nữ-Đạt)', course: 'IKI-N4', fee: 440000,
    start: '2026-03-02', end: '2026-09-20', students: ['S000009', 'S000010'],
    mainTeacher: 'GV02', supportTeacher: 'GV04',
    chStart: '2026-09-04',
    slots: { T2: ['8', 'GV02'], T4: ['8', 'GV06'], T6: ['8', 'GV04'] },
    pool: ['GV02', 'GV06', 'GV04', 'GV03', 'GV10', 'GV05', 'GV09'],
  },
  {
    code: 'IKI03-GO-N3S', name: 'IKI03-GO-N3S (Haley Ngô)', course: 'IKI-N3', fee: 150000,
    start: '2026-03-04', end: '2026-09-30', students: ['S000008'],
    mainTeacher: 'GV04', supportTeacher: 'GV02',
    chStart: '2026-09-07',
    slots: { T3: ['1', 'GV04'], T6: ['1', 'GV02'] },
    pool: ['GV04', 'GV02', 'GV03'],
  },
  {
    code: 'IKI03-GO-N3T', name: 'IKI03-GO-N3T (Sơn)', course: 'IKI-N3', fee: 200000,
    start: '2026-03-09', end: '2026-12-23', students: ['S000007'],
    mainTeacher: 'GV02', supportTeacher: 'GV03',
    chStart: '2026-09-14',
    slots: { T2: ['9', 'GV02'], T3: ['9', 'GV03'], T4: ['9', 'GV10'], T5: ['9', 'GV09'], T6: ['9', 'GV02'], T7: ['9', 'GV08'] },
    pool: ['GV02', 'GV03', 'GV10', 'GV09', 'GV05', 'GV06'],
  },
  {
    code: 'IKI05-GO-N5T', name: 'IKI05-GO-N5T (Hà)', course: 'IKI-N5', fee: 250000,
    start: '2026-05-25', end: '2026-10-15', students: ['S000006'],
    mainTeacher: 'GV05', supportTeacher: 'GV03',
    chStart: '2026-09-07',
    slots: { T2: ['9', 'GV05'], T6: ['9', 'GV05'] },
    pool: ['GV05', 'GV03', 'GV10', 'GV02', 'GV09'],
  },
  {
    code: 'IKI06-GO-NM', name: 'IKI06-GO-NM (Nguyệt Minh)', course: 'IKI-NM', fee: 220000,
    start: '2026-06-05', end: '2026-11-11', students: ['S000005'],
    mainTeacher: 'GV05', supportTeacher: 'GV08',
    chStart: '2026-09-04',
    slots: { T4: ['7B', 'GV05'], T6: ['7B', 'GV05'] },
    pool: ['GV05', 'GV02', 'GV08', 'GV09', 'GV03'],
  },
  {
    code: 'IKI07-GO-NM-T2', name: 'IKI07-GO-NM T2 (PLinh)', course: 'IKI-NM', fee: 220000,
    start: '2026-06-30', end: '2026-10-12', students: ['S000004'],
    mainTeacher: 'GV02', supportTeacher: 'GV03',
    chStart: '2026-09-07',
    slots: { T2: ['8', 'GV02'], T3: ['7', 'GV02'], T7: ['7', 'GV03'] },
    pool: ['GV02', 'GV03', 'GV08', 'GV09', 'GV05'],
  },
  {
    code: 'IKI08-GO-N4C', name: 'IKI08-GO-N4C (Thùy Dung)', course: 'IKI-N4', fee: 200000,
    start: '2026-08-05', end: '2026-10-12', students: ['S000003'],
    mainTeacher: 'GV09', supportTeacher: 'GV04',
    chStart: '2026-09-09',
    slots: { T2: ['5-6', 'GV09'], T6: ['5-6', 'GV08'] },
    pool: ['GV09', 'GV08', 'GV04', 'GV03', 'GV02', 'GV05'],
  },
  {
    code: 'IKI08-GO-N3P', name: 'IKI08-GO-N3+ (Phương)', course: 'IKI-N3', fee: 220000,
    start: '2026-08-10', end: '2026-10-06', students: ['S000002'],
    mainTeacher: 'GV06', supportTeacher: 'GV10',
    chStart: '2026-09-11',
    slots: { T3: ['7', 'GV06'], T6: ['7', 'GV10'] },
    pool: ['GV06', 'GV10', 'GV03', 'GV09', 'GV02'],
  },
];

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const overlap = (aS, aE, bS, bE) => toMin(aS) < toMin(bE) && toMin(bS) < toMin(aE);

async function wipe() {
  // FK-safe order; giữ lại: Role/Permission/UserRole/RolePermission, User (staff),
  // Course (9 khóa spec), Setting, StatusDefinition, TeacherRate
  const wipeOrder = [
    'message', 'conversationParticipant', 'conversation',
    'notification', 'attachment', 'auditLog', 'approval', 'commission',
    'teacherPayrollItem', 'teacherPayrollPeriod', 'teacherAvailability', 'teacherAssignment',
    'attendance', 'learningProgress', 'sessionChange', 'session',
    'assessment', 'academicWarning',
    'paymentAdjustment', 'payment', 'receivable',
    'enrollmentEvent', 'enrollment', 'classMember',
    'leadActivity', 'leadFollowUp', 'trialTest', 'studentContact',
  ];
  for (const m of wipeOrder) {
    const n = await prisma[m].deleteMany({});
    if (n.count) console.log(`  xóa ${m}: ${n.count}`);
  }
  // user portal gắn student/teacher demo → xóa trước
  const nu = await prisma.user.deleteMany({ where: { OR: [{ studentId: { not: null } }, { teacherId: { not: null } }] } });
  if (nu.count) console.log(`  xóa user portal: ${nu.count}`);
  for (const m of ['class', 'student', 'teacher', 'lead']) {
    const n = await prisma[m].deleteMany({});
    if (n.count) console.log(`  xóa ${m}: ${n.count}`);
  }
}

async function main() {
  console.log('=== XÓA DATA DEMO ===');
  await wipe();

  console.log('=== TẠO KHÓA HỌC IKI ===');
  const courseMap = {};
  for (const c of COURSES) {
    courseMap[c.code] = await prisma.course.upsert({
      where: { code: c.code },
      update: { name: c.name, priceOneOnOne: c.priceOneOnOne, priceLevel: c.priceLevel },
      create: { ...c, courseGroup: 'gia_su', format: undefined },
    });
    console.log('  course', c.code);
  }

  console.log('=== TẠO GIÁO VIÊN ===');
  const teacherMap = {};
  for (const t of TEACHERS) {
    teacherMap[t.code] = await prisma.teacher.create({
      data: { code: t.code, name: t.name, phone: '0900000' + t.code.slice(2), cooperationType: t.coop, employmentStatus: 'official' },
    });
    console.log('  GV', t.code, t.name);
  }

  console.log('=== TẠO HỌC VIÊN ===');
  const studentMap = {};
  for (const s of STUDENTS) {
    studentMap[s.code] = await prisma.student.create({
      data: {
        code: s.code, name: s.name, phone: s.phone,
        birthDate: s.birthDate ? new Date(s.birthDate) : null,
        status: 'studying', goal: 'Tiếng Nhật', notes: s.note,
      },
    });
    console.log('  HV', s.code, s.name);
  }

  console.log('=== TẠO LỚP + GHI DANH + SESSIONS ===');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const assigned = {}; // teacherId → [{dateKey, start, end}]
  const busy = (tid, dateKey, s, e) => (assigned[tid] || []).some((x) => x.dateKey === dateKey && overlap(x.start, x.end, s, e));
  const book = (tid, dateKey, s, e) => { (assigned[tid] = assigned[tid] || []).push({ dateKey, start: s, end: e }); };

  let gdSeq = 1;
  for (const c of CLASSES) {
    const schedText = Object.entries(c.slots)
      .map(([d, [tiet]]) => `${d} ${TIET[tiet][0]}-${TIET[tiet][1]}`).join('; ') || 'Chờ chặng mới';

    const cls = await prisma.class.create({
      data: {
        code: c.code, name: c.name, courseId: courseMap[c.course].id,
        classType: 'one_on_one', format: 'online', status: 'studying',
        startDate: new Date(c.start), endDate: new Date(c.end),
        minStudents: 1, maxStudents: c.students.length,
        currentStudents: c.students.length, studyingStudents: c.students.length,
        mainTeacherId: teacherMap[c.mainTeacher].id,
        supportTeacherId: teacherMap[c.supportTeacher].id,
        schedule: schedText,
      },
    });
    console.log(`  lớp ${c.code} (${schedText})`);

    // ghi danh + xếp lớp
    for (const sCode of c.students) {
      const weeklyHours = Object.values(c.slots).reduce((sum, [tiet]) => sum + (toMin(TIET[tiet][1]) - toMin(TIET[tiet][0])) / 60, 0);
      const monthlyHours = Math.round(weeklyHours * 4);
      const fee = c.fee * monthlyHours;
      await prisma.enrollment.create({
        data: {
          code: `GD${String(gdSeq++).padStart(4, '0')}`,
          studentId: studentMap[sCode].id, courseId: courseMap[c.course].id, classId: cls.id,
          status: 'studying', startDate: new Date(c.start), endDate: new Date(c.end),
          classType: 'one_on_one', billingType: 'monthly',
          totalHours: monthlyHours, unitPrice: c.fee, monthlyHours,
          grossFee: fee, finalFee: fee,
        },
      });
      await prisma.classMember.create({
        data: { classId: cls.id, studentId: studentMap[sCode].id, status: 'active', joinedAt: new Date(c.start) },
      });
    }

    // sinh sessions cho chặng đang học: chStart → endDate
    if (!c.chStart) { console.log(`    ${c.code}: không có chặng đang học — bỏ qua sinh lịch`); continue; }
    const from = new Date(c.chStart); const to = new Date(c.end);
    let made = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dowName = Object.keys(DOW).find((k) => DOW[k] === d.getDay());
      const slot = dowName && c.slots[dowName];
      if (!slot) continue;
      const [tiet, prefT] = slot;
      const [st, en] = TIET[tiet];
      const dateKey = d.toISOString().slice(0, 10);
      // chọn GV: ưu tiên → pool, tránh trùng giờ cùng ngày
      let tid = prefT;
      if (busy(teacherMap[tid].id, dateKey, st, en)) {
        tid = (c.pool || []).find((t) => !busy(teacherMap[t].id, dateKey, st, en)) || prefT;
        if (tid !== prefT) console.log(`    ${dateKey} ${dowName}: ${prefT} bận → ${tid}`);
      }
      book(teacherMap[tid].id, dateKey, st, en);
      await prisma.session.create({
        data: {
          classId: cls.id, date: new Date(d), startTime: st, endTime: en,
          teacherId: teacherMap[tid].id,
          status: d < today ? 'taught' : 'planned',
          calculatedHours: (toMin(en) - toMin(st)) / 60,
        },
      });
      made++;
    }
    console.log(`    ${c.code}: ${made} buổi`);
  }

  console.log('=== XONG ===');
  const counts = await Promise.all(['student', 'teacher', 'class', 'session', 'enrollment'].map((m) => prisma[m].count()));
  console.log(`students=${counts[0]} teachers=${counts[1]} classes=${counts[2]} sessions=${counts[3]} enrollments=${counts[4]}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
