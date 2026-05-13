import { supabase } from '../lib/supabase';
import { Candidate, CandidateStatus, PaginatedResponse } from '../types';

export interface CandidateFilters {
  search?: string;
  status?: CandidateStatus;
  location?: string;
  min_experience?: number;
  max_salary?: number;
}

export interface CreateCandidateInput {
  full_name: string;
  email?: string;
  phone?: string;
  position: string;
  experience_years?: number;
  expected_salary?: number;
  location?: string;
  resume_url?: string;
}

export const candidateService = {
  async create(data: CreateCandidateInput): Promise<Candidate> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: result, error } = await supabase
      .from('candidates')
      .insert({ ...data, created_by: user?.id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result as Candidate;
  },

  async list(page: number, limit = 15, filters: CandidateFilters = {}): Promise<PaginatedResponse<Candidate>> {
    let query = supabase.from('candidates').select('*', { count: 'exact' });

    if (filters.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,position.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
      );
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.location) query = query.ilike('location', `%${filters.location}%`);
    if (filters.min_experience !== undefined) query = query.gte('experience_years', filters.min_experience);
    if (filters.max_salary !== undefined) query = query.lte('expected_salary', filters.max_salary);

    const from = (page - 1) * limit;
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return { items: data as Candidate[], total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string): Promise<Candidate> {
    const { data, error } = await supabase.from('candidates').select('*').eq('id', id).single();
    if (error) throw new Error('Candidato no encontrado');
    return data as Candidate;
  },

  async updateStatus(id: string, status: CandidateStatus): Promise<Candidate> {
    const { data, error } = await supabase
      .from('candidates')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Candidate;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async getStatsByStatus(): Promise<Record<string, number>> {
    const { data, error } = await supabase.from('candidates').select('status');
    if (error) throw new Error(error.message);
    return (data ?? []).reduce((acc: Record<string, number>, c: { status: string }) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {});
  },
};
