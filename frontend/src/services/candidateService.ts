import { api } from '../lib/api';
import { Candidate, CandidateStatus, PaginatedResponse } from '../types';

export interface CreateCandidateInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  resume_url?: string;
}

export const candidateService = {
  list: (page: number, limit = 15, status?: CandidateStatus) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return api.get<PaginatedResponse<Candidate>>(`/candidates?${params}`);
  },
  getById: (id: string) => api.get<Candidate>(`/candidates/${id}`),
  create: (data: CreateCandidateInput) => api.post<Candidate>('/candidates', data),
  updateStatus: (id: string, status: CandidateStatus) =>
    api.patch<Candidate>(`/candidates/${id}/status`, { status }),
  delete: (id: string) => api.delete<void>(`/candidates/${id}`),
};
