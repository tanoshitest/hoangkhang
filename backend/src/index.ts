import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import leadRoutes from './routes/leads';
import studentRoutes from './routes/students';
import courseRoutes from './routes/courses';
import classRoutes from './routes/classes';
import sessionRoutes from './routes/sessions';
import teacherRoutes from './routes/teachers';
import warningRoutes from './routes/warnings';
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/leads', authenticateToken, leadRoutes);
app.use('/api/students', authenticateToken, studentRoutes);
app.use('/api/courses', authenticateToken, courseRoutes);
app.use('/api/classes', authenticateToken, classRoutes);
app.use('/api/sessions', authenticateToken, sessionRoutes);
app.use('/api/teachers', authenticateToken, teacherRoutes);
app.use('/api/warnings', authenticateToken, warningRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
