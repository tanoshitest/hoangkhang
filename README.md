# CRM Hoàng Khang - Giai đoạn 1

Hệ thống CRM quản lý nội bộ cho Trung tâm tiếng Nhật Online Nhật ngữ Hoàng Khang.

## 🎯 Mục tiêu

Xây dựng CRM quản lý xuyên suốt hành trình:
**Lead → Tư vấn → Kiểm tra/Học thử → Đăng ký → Học viên → Xếp lớp → Lịch học → Điểm danh/Học tập → Học phí/Công nợ → Kết thúc khóa → Đăng ký tiếp**

## 👥 6 Role người dùng

1. **Quản trị hệ thống** - Toàn quyền dữ liệu
2. **Quản lý trung tâm** - Xem toàn bộ vận hành
3. **Tư vấn tuyển sinh** - Quản lý lead được phụ trách
4. **Đào tạo** - Quản lý học viên, khóa học, lớp học
5. **Giáo viên** - Xem lịch dạy, điểm danh, cập nhật nội dung
6. **Kế toán** - Quản lý học phí, công nợ, giao dịch

## 🚀 Tech Stack

- **Frontend**: Next.js 14 + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT + RBAC
- **Deployment**: Docker + Coolify

## 📦 Project Structure

```
crm-hoangkhang/
├── frontend/          # Next.js app
├── backend/           # Express API
├── docker-compose.yml # Local development
└── README.md
```

## 🛠️ Setup Development

### 1. Clone repository
```bash
git clone <repository-url>
cd crm-hoangkhang
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env với database credentials
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Admin: admin@hoangkhang.com / admin123

## 🐳 Docker Deployment

```bash
# Build and run all services
docker-compose up --build

# Run in background
docker-compose up -d
```

## 📋 Features Implemented

### ✅ Phase D - Foundation
- [x] Project structure (Frontend + Backend)
- [x] Database schema (PostgreSQL + Prisma)
- [x] Authentication (JWT)
- [x] RBAC (6 roles)
- [x] Layout components (Sidebar, Header)
- [x] Docker configuration
- [x] Seed data (roles, admin user, status definitions)

### 🚧 Phase E - CRM & Student (In Progress)
- [x] Lead management (List, Create, Update, Convert)
- [x] Student management (List, Create, Update)
- [ ] Lead Kanban view
- [ ] Student Detail tabs
- [ ] Enrollment management
- [ ] Duplicate detection

### ⏸️ Upcoming Phases
- Phase F: Academic (Courses, Classes, Sessions, Attendance)
- Phase G: Finance (Receivables, Payments, Adjustments)
- Phase H: Teacher & Payroll
- Phase I: Dashboard & Reports
- Phase J: Import/Export, Admin, Hardening

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin)
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `GET /api/users/roles/list` - Get all roles

### Leads
- `GET /api/leads` - Get leads with pagination
- `GET /api/leads/:id` - Get lead by ID
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `POST /api/leads/:id/convert` - Convert lead to student

### Students
- `GET /api/students` - Get students with pagination
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `GET /api/students/:id/enrollments` - Get student enrollments
- `POST /api/students/:id/enroll` - Enroll student to course

## 🎨 UI/UX

- **Color Palette**: Xanh chủ đạo (#2563EB)
- **Design**: Clean, simple, responsive
- **Mobile-first**: Optimized for mobile devices
- **Components**: Cards, tables, forms with Vietnamese labels

## 🚀 Deployment với Coolify

1. **Connect GitHub**: Kết nối repository với Coolify
2. **Configure**: Set environment variables
3. **Auto-deploy**: Push code → Auto deploy lên VPS

### Environment Variables
```env
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-jwt-secret
PORT=3001
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

## 📞 Support

- **Documentation**: Xem file plan trong `/docs`
- **Issues**: Tạo issue trong GitHub repository
- **Devin Support**: https://devin.ai/support

---

**Built with ❤️ for Hoàng Khang Japanese Center**
