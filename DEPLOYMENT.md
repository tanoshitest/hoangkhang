# Deployment Guide - CRM Hoàng Khang

## 🚀 Coolify Auto Deploy Setup

### 1. VPS Requirements
- Ubuntu 20.04+ hoặc Debian 11+
- Docker và Docker Compose installed
- Domain trỏ về VPS IP (optional)

### 2. Coolify Installation
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Coolify
curl -fsSL https://get.coollabs.io/coolify/install.sh | bash
```

### 3. GitHub Repository Setup
1. Tạo repository mới: `crm-hoangkhang`
2. Push code lên GitHub:
```bash
git remote add origin https://github.com/your-username/crm-hoangkhang.git
git branch -M main
git push -u origin main
```

### 4. Coolify Configuration

#### Connect Repository
1. Truy cập Coolify dashboard (http://your-vps-ip:8000)
2. Connect GitHub account
3. Select repository `crm-hoangkhang`
4. Choose branch `main`

#### Application Settings
- **Build Pack**: Dockerfile
- **Base Directory**: `/`
- **Port**: 3000 (frontend)
- **Health Check**: `/health`

#### Environment Variables
```env
# Backend
DATABASE_URL=file:./prod.db
JWT_SECRET=your-super-secret-jwt-key-production
PORT=3001
NODE_ENV=production

# Frontend  
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

#### Database
- Sử dụng SQLite cho GĐ1 (file-based, no external DB needed)
- Volume mount: `/app/backend/prisma/dev.db`

### 5. Auto Deploy Workflow
```
Local Development → Git Push → GitHub → Coolify → Auto Deploy
```

### 6. Manual Deployment (Alternative)

#### Build Images
```bash
# Backend
docker build -t crm-backend ./backend

# Frontend  
docker build -t crm-frontend ./frontend
```

#### Run Containers
```bash
# Create network
docker network create crm-network

# Backend
docker run -d \
  --name crm-backend \
  --network crm-network \
  -p 3001:3001 \
  -e DATABASE_URL=file:./prod.db \
  -e JWT_SECRET=your-secret \
  crm-backend

# Frontend
docker run -d \
  --name crm-frontend \
  --network crm-network \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3001 \
  crm-frontend
```

### 7. SSL/HTTPS Setup (Production)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. Monitoring & Logs

#### View Logs
```bash
# Coolify logs
docker logs coolify

# Application logs
docker logs crm-backend
docker logs crm-frontend
```

#### Health Checks
- Frontend: `http://your-domain.com/health`
- Backend: `http://your-domain.com:3001/health`

### 9. Backup Strategy

#### Database Backup (SQLite)
```bash
# Daily backup
docker exec crm-backend cp /app/prisma/dev.db /app/backups/dev-$(date +%Y%m%d).db

# Download backup
docker cp crm-backend:/app/backups/dev-20250917.db ./backup.db
```

#### Application Backup
```bash
# Backup volumes
docker run --rm -v crm-backend_data:/data -v $(pwd):/backup alpine tar czf /backup/backend-data.tar.gz -C /data .
```

### 10. Troubleshooting

#### Common Issues

**Port conflicts:**
```bash
# Check ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Kill processes
sudo kill -9 <PID>
```

**Database issues:**
```bash
# Check database file
docker exec crm-backend ls -la /app/prisma/

# Reset database
docker exec crm-backend rm /app/prisma/dev.db
docker restart crm-backend
```

**Permission issues:**
```bash
# Fix file permissions
sudo chown -R 1000:1000 ./data
```

### 11. Production Checklist

- [ ] Domain configured and pointing to VPS
- [ ] SSL certificate installed
- [ ] Environment variables set correctly
- [ ] Database seeded with initial data
- [ ] Admin user created
- [ ] Health checks working
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Firewall configured (ports 80, 443, 8000)
- [ ] Auto-deploy tested

### 12. Rollback Plan

```bash
# Coolify rollback
# 1. Go to Coolify dashboard
# 2. Select application
# 3. Click "Deploy" → "Rollback"
# 4. Choose previous deployment

# Manual rollback
docker tag crm-backend:latest crm-backend:rollback
docker pull crm-backend:previous-version
docker stop crm-backend
docker rm crm-backend
docker run -d --name crm-backend [previous-version]
```

---

## 🎯 Success Criteria

**Deployment thành công khi:**
- ✅ Frontend accessible at `https://your-domain.com`
- ✅ Backend API responding at `https://your-domain.com/api`
- ✅ Login working với admin@hoangkhang.com / admin123
- ✅ Dashboard loads với sidebar navigation
- ✅ Database persists data between deployments
- ✅ Auto-deploy works on git push

---

**Need help?** Check Coolify docs: https://coolify.io/docs