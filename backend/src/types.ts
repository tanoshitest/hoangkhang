import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  studentId?: string | null;
  teacherId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
