export type UserRole = 'admin' | 'recruiter' | 'candidate';
export type CandidateStatus = 'pending' | 'interviewed' | 'hired' | 'rejected';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
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
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
