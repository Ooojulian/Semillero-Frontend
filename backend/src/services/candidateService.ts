import { z } from 'zod';
import { query } from '../db';
import { Candidate, CandidateStatus, PaginatedResponse } from '../types';
import { AppError } from '../middlewares/errorHandler';

export const createCandidateSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  position: z.string().max(150).optional(),
  resume_url: z.string().url().optional(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

export const candidateService = {
  async create(data: CreateCandidateInput, createdBy: string): Promise<Candidate> {
    const exists = await query('SELECT id FROM candidates WHERE email = $1', [data.email]);
    if ((exists.rows as unknown[]).length > 0) throw new AppError(409, 'Candidato ya registrado con ese email');

    const result = await query<Candidate>(
      `INSERT INTO candidates (first_name, last_name, email, phone, position, resume_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.first_name, data.last_name, data.email, data.phone, data.position, data.resume_url, createdBy]
    );
    return (result.rows as unknown as Candidate[])[0];
  },

  async list(page: number, limit: number, status?: CandidateStatus): Promise<PaginatedResponse<Candidate>> {
    const offset = (page - 1) * limit;
    const where = status ? 'WHERE status = $3' : '';
    const params: unknown[] = status ? [limit, offset, status] : [limit, offset];

    const [data, count] = await Promise.all([
      query<Candidate>(`SELECT * FROM candidates ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, params),
      query(`SELECT COUNT(*) FROM candidates ${where}`, status ? [status] : []),
    ]);

    const total = parseInt((count.rows as unknown as { count: string }[])[0].count, 10);
    return {
      items: data.rows as unknown as Candidate[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string): Promise<Candidate> {
    const result = await query<Candidate>('SELECT * FROM candidates WHERE id = $1', [id]);
    const candidate = (result.rows as unknown as Candidate[])[0];
    if (!candidate) throw new AppError(404, 'Candidato no encontrado');
    return candidate;
  },

  async updateStatus(id: string, status: CandidateStatus): Promise<Candidate> {
    const result = await query<Candidate>(
      'UPDATE candidates SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    const candidate = (result.rows as unknown as Candidate[])[0];
    if (!candidate) throw new AppError(404, 'Candidato no encontrado');
    return candidate;
  },

  async delete(id: string): Promise<void> {
    const result = await query('DELETE FROM candidates WHERE id = $1', [id]);
    if ((result as unknown as { rowCount: number }).rowCount === 0) throw new AppError(404, 'Candidato no encontrado');
  },
};
