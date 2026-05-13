export type UserRole = 'superAdmin' | 'recruiter';
export type CandidateStatus = 'pending' | 'interviewed' | 'hired' | 'rejected';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface Candidate {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  position: string;
  experience_years?: number;
  expected_salary?: number;
  location?: string;
  status: CandidateStatus;
  source: 'internal' | 'scraping';
  resume_url?: string;
  profile_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchHistory {
  id: string;
  query: string;
  candidates_found: number;
  user_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  candidates?: Candidate[];
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
