'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CandidateTable } from './CandidateTable';
import { candidateService, CreateCandidateInput } from '../../services/candidateService';
import { Candidate } from '../../types';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';

export const CandidatesView = () => {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const createMutation = useMutation({
    mutationFn: (data: CreateCandidateInput) => candidateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setShowForm(false);
      toast.success('Candidato creado exitosamente');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al crear candidato'),
  });

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />

      <div>
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1>Candidatos</h1>
            <p>Gestiona el pipeline de reclutamiento</p>
          </div>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setShowForm(true)}>
            + Nuevo candidato
          </button>
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Nuevo candidato</h3>
                <button onClick={() => setShowForm(false)} className="modal-close">×</button>
              </div>
              <CandidateForm
                onSubmit={(data) => createMutation.mutate(data)}
                loading={createMutation.isPending}
                error={createMutation.error?.message ?? null}
              />
            </div>
          </div>
        )}

        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selected.full_name}</h3>
                <button onClick={() => setSelected(null)} className="modal-close">×</button>
              </div>
              <CandidateDetail candidate={selected} />
            </div>
          </div>
        )}

        <CandidateTable onSelect={setSelected} />
      </div>
    </>
  );
};

const CandidateForm = ({ onSubmit, loading, error }: { onSubmit: (d: CreateCandidateInput) => void; loading: boolean; error: string | null }) => {
  const [form, setForm] = useState<CreateCandidateInput>({
    full_name: '', email: '', phone: '', position: '', experience_years: undefined, expected_salary: undefined, location: '', resume_url: '',
  });

  const set = (k: keyof CreateCandidateInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value || undefined }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div className="form-error">{error}</div>}
      <div className="form-group">
        <label>Nombre completo *</label>
        <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Juan Pérez" required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email ?? ''} onChange={set('email')} placeholder="juan@email.com" />
        </div>
        <div className="form-group">
          <label>Teléfono</label>
          <input value={form.phone ?? ''} onChange={set('phone')} placeholder="+57 300 000 0000" />
        </div>
      </div>
      <div className="form-group">
        <label>Cargo / Perfil *</label>
        <input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="Desarrollador Frontend" required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Experiencia (años)</label>
          <input type="number" min={0} value={form.experience_years ?? ''} onChange={(e) => setForm((f) => ({ ...f, experience_years: e.target.value ? Number(e.target.value) : undefined }))} placeholder="3" />
        </div>
        <div className="form-group">
          <label>Salario esperado (COP)</label>
          <input type="number" min={0} value={form.expected_salary ?? ''} onChange={(e) => setForm((f) => ({ ...f, expected_salary: e.target.value ? Number(e.target.value) : undefined }))} placeholder="3500000" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Ubicación</label>
          <input value={form.location ?? ''} onChange={set('location')} placeholder="Bogotá, Colombia" />
        </div>
        <div className="form-group">
          <label>URL del CV</label>
          <input type="url" value={form.resume_url ?? ''} onChange={set('resume_url')} placeholder="https://..." />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear candidato'}
      </button>
    </form>
  );
};

const fmt = (n?: number) => n !== undefined ? `$${n.toLocaleString('es-CO')}` : '—';

const CandidateDetail = ({ candidate: c }: { candidate: Candidate }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {[
      { label: 'Email',         value: c.email ?? '—' },
      { label: 'Teléfono',      value: c.phone ?? '—' },
      { label: 'Cargo',         value: c.position },
      { label: 'Experiencia',   value: c.experience_years !== undefined ? `${c.experience_years} años` : '—' },
      { label: 'Salario esp.',  value: fmt(c.expected_salary) },
      { label: 'Ubicación',     value: c.location ?? '—' },
      { label: 'Estado',        value: c.status },
      { label: 'Fuente',        value: c.source === 'internal' ? 'Base interna' : 'Web scraping' },
      { label: 'Registrado',    value: new Date(c.created_at).toLocaleString('es-CO') },
    ].map(({ label, value }) => (
      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{label}</span>
        <span style={{ color: 'var(--text-1)', fontSize: 13 }}>{value}</span>
      </div>
    ))}
    {c.resume_url && (
      <a href={c.resume_url} target="_blank" rel="noopener noreferrer" className="btn-primary"
        style={{ textAlign: 'center', display: 'block', marginTop: 8, textDecoration: 'none' }}>
        Ver CV
      </a>
    )}
  </div>
);
