import { Request } from 'express';

export type UserRole = 'admin' | 'recruiter' | 'candidate';
export type CandidateStatus = 'pending' | 'interviewed' | 'hired' | 'rejected';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  status: CandidateStatus;
  resume_url?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: UserRole };
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
