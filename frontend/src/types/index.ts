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
  source: 'internal' | 'scraping' | 'applicant';
  resume_url?: string;
  profile_url?: string;
  linkedin_url?: string;
  vacancy_id?: string;
  vacancy?: Vacancy;
  created_by?: string;
  created_at: string;
  updated_at: string;
  match_reason?: string;
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

export type VacancyStatus = 'active' | 'paused' | 'closed';
export type VacancyModality = 'presencial' | 'remoto' | 'híbrido';

export interface Vacancy {
  id: string;
  title: string;
  company: string;
  description?: string;
  location?: string;
  modality: VacancyModality;
  salary_min?: number;
  salary_max?: number;
  experience_years_min?: number;
  skills?: string[];
  status: VacancyStatus;
  created_by?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
  applicants_count?: number;
}

export interface CandidateNote {
  id: string;
  candidate_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: { full_name: string; email: string };
}

export interface StatusHistoryEntry {
  id: string;
  candidate_id: string;
  from_status: CandidateStatus | null;
  to_status: CandidateStatus;
  changed_by: string | null;
  changed_at: string;
  changer?: { full_name: string };
}
