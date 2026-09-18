# Deployment Guide - CRM Hoàng Khang

## Kiến trúc Production

```
Browser → Frontend (Next.js, port 3000)
       → Backend API (Express, port 3001)
       → PostgreSQL 15 (port 5432, volume postgres_data)
```

- Dev dùng SQLite (`prisma/schema.prisma`), production dùng PostgreSQL (`prisma/schema.prod.prisma` — cùng models, chỉ khác provider).
- Backend container tự `prisma db push --schema prisma/schema.prod.prisma` khi start.
- `NEXT_PUBLIC_API_URL` được inline lúc build frontend (build ARG) — phải trỏ đúng URL public của backend.

---

## 🚀 Deploy với Coolify trên VPS

### 1. Chuẩn bị VPS
```bash
# Ubuntu 22.04+ — cài Docker
curl -fsSL https://get.docker.com | sh

# Cài Coolify
curl -fsSL https://get.coollabs.io/coolify/install.sh | bash
```
Coolify dashboard: `http://<VPS_IP>:8000`

### 2. Push code lên GitHub
```bash
git remote add origin https://github.com/<you>/crm-hoangkhang.git
git push -u origin master   # hoặc đổi tên branch thành main
```

### 3. Tạo project trong Coolify
**Project → New → Private Repository (GitHub App) → chọn repo → branch `master`**

Coolify đọc `docker-compose.yml` ở root — 3 services: `postgres`, `backend`, `frontend`.

### 4. Environment variables (Coolify UI → Environment)

| Biến | Giá trị | Ghi chú |
|------|---------|---------|
| `POSTGRES_PASSWORD` | chuỗi ngẫu nhiên mạnh | **bắt buộc** |
| `POSTGRES_USER` | `postgres` | optional |
| `POSTGRES_DB` | `crm_hoangkhang` | optional |
| `JWT_SECRET` | chuỗi ngẫu nhiên ≥32 ký tự | **bắt buộc** — `openssl rand -hex 32` |
| `NEXT_PUBLIC_API_URL` | `https://api.<domain>` hoặc `http://<VPS_IP>:3001` | **bắt buộc** — URL public của backend |
| `SEED_DB` | `true` (chỉ lần deploy đầu) | tạo 6 roles + admin user |
| `BACKEND_PORT` | `3001` | optional |
| `FRONTEND_PORT` | `3000` | optional |

### 5. Domains
- Frontend service: gán `crm.<domain>` (hoặc `http://<VPS_IP>:3000`)
- Backend service: gán `api.<domain>` (hoặc `http://<VPS_IP>:3001`)
- Bật HTTPS (Let's Encrypt) trong Coolify cho cả hai.

⚠️ `NEXT_PUBLIC_API_URL` là **build-time** — đổi giá trị này phải **redeploy frontend** (build lại image).

### 6. Deploy lần đầu
1. Set `SEED_DB=true` → Deploy
2. Đợi backend log hiện `Server running on port 3001`
3. Login `admin@hoangkhang.com` / `admin123` → **đổi mật khẩu ngay** (Settings → Người dùng)
4. Set `SEED_DB=false` → Redeploy (tránh seed lại)

### 7. Auto-deploy
Coolify watch branch `master` — mỗi `git push` → tự build + deploy lại.

---

## 🖥️ Deploy thủ công (không Coolify)

```bash
git clone <repo> && cd crm-hoangkhang
cp .env.example .env   # điền POSTGRES_PASSWORD, JWT_SECRET, NEXT_PUBLIC_API_URL
# Lần đầu:
SEED_DB=true docker compose up -d --build
# Các lần sau:
docker compose up -d --build
```

Logs: `docker compose logs -f backend`

---

## 💾 Backup & Restore

### Backup (đã có sẵn trong app)
- UI: **Hệ thống → Cấu hình → "Tải backup (JSON)"** — export toàn bộ DB (không chứa password hash).
- API: `GET /api/admin/backup` (admin only).

### Backup DB trực tiếp (khuyến nghị hằng ngày)
```bash
docker exec crm-hoangkhang-postgres-1 pg_dump -U postgres crm_hoangkhang > backup-$(date +%F).sql
# Cron: 0 2 * * * → chạy lúc 2h sáng
```

### Restore
```bash
# Từ pg_dump:
cat backup-2026-09-18.sql | docker exec -i crm-hoangkhang-postgres-1 psql -U postgres crm_hoangkhang

# Volume postgres_data nằm ở /var/lib/docker/volumes/crm-hoangkhang_postgres_data
```

---

## ✅ Production Checklist (Phase K)

- [ ] VPS + Docker + Coolify cài đặt
- [ ] Repo push GitHub, Coolify connect
- [ ] Env vars đầy đủ (password/secret mạnh, không dùng giá trị mẫu)
- [ ] `NEXT_PUBLIC_API_URL` đúng URL public backend
- [ ] Deploy với `SEED_DB=true` → login admin → **đổi mật khẩu**
- [ ] `SEED_DB=false` → redeploy
- [ ] Tạo tài khoản thật theo role (Hệ thống → Người dùng)
- [ ] Import dữ liệu thật (Hệ thống → Import)
- [ ] UAT: chạy `python scripts/uat.py --base https://api.<domain>` — 32/32 PASS
- [ ] AC10 manual: kiểm tra trên Chrome desktop + mobile
- [ ] Cron backup pg_dump hằng ngày
- [ ] Test backup JSON tải về được + pg_restore thử trên DB phụ

## 🔧 Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| Frontend gọi API 404/CORS | `NEXT_PUBLIC_API_URL` sai | Sửa env → **redeploy** (build-time var) |
| Backend crash lúc start | `DATABASE_URL`/postgres chưa ready | Check `docker compose logs postgres`; entrypoint tự `db push` |
| Login 401 sau deploy | DB trống (chưa seed) | `SEED_DB=true` → redeploy → login → tắt seed |
| Build backend fail bcrypt | Thiếu build tools | Dockerfile đã có python3/make/g++ trong builder stage |

---

## 📋 UAT Script

`scripts/uat.py` — chạy 32 checks cho AC01–AC09 (AC10 kiểm tra thủ công trên browser):

```bash
python scripts/uat.py --base http://localhost:3001
# hoặc production:
python scripts/uat.py --base https://api.<domain> --email admin@hoangkhang.com --password <mật_khẩu>
```

⚠️ Script tạo dữ liệu test (lead/học viên/course/class/session/payment "UAT ...") — chạy trên production thì xóa sau, hoặc chạy trên staging DB.
