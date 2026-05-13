'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CandidateTable } from './CandidateTable';
import { candidateService, CreateCandidateInput } from '../../services/candidateService';
import { Candidate } from '../../types';

export const CandidatesView = () => {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateCandidateInput) => candidateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setShowForm(false);
    },
  });

  return (
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
              <h3>{selected.first_name} {selected.last_name}</h3>
              <button onClick={() => setSelected(null)} className="modal-close">×</button>
            </div>
            <CandidateDetail candidate={selected} />
          </div>
        </div>
      )}

      <CandidateTable onSelect={setSelected} />
    </div>
  );
};

interface FormProps {
  onSubmit: (data: CreateCandidateInput) => void;
  loading: boolean;
  error: string | null;
}

const CandidateForm = ({ onSubmit, loading, error }: FormProps) => {
  const [form, setForm] = useState<CreateCandidateInput>({
    first_name: '', last_name: '', email: '', phone: '', position: '', resume_url: '',
  });

  const set = (k: keyof CreateCandidateInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Nombre *</label>
          <input value={form.first_name} onChange={set('first_name')} placeholder="Juan" required />
        </div>
        <div className="form-group">
          <label>Apellido *</label>
          <input value={form.last_name} onChange={set('last_name')} placeholder="Pérez" required />
        </div>
      </div>
      <div className="form-group">
        <label>Email *</label>
        <input type="email" value={form.email} onChange={set('email')} placeholder="juan@email.com" required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label>Teléfono</label>
          <input value={form.phone} onChange={set('phone')} placeholder="+57 300 000 0000" />
        </div>
        <div className="form-group">
          <label>Cargo</label>
          <input value={form.position} onChange={set('position')} placeholder="Desarrollador Frontend" />
        </div>
      </div>
      <div className="form-group">
        <label>URL del CV</label>
        <input type="url" value={form.resume_url} onChange={set('resume_url')} placeholder="https://..." />
      </div>
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Guardando...' : 'Crear candidato'}
      </button>
    </form>
  );
};

const CandidateDetail = ({ candidate }: { candidate: Candidate }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {[
      { label: 'Email', value: candidate.email },
      { label: 'Teléfono', value: candidate.phone ?? '—' },
      { label: 'Cargo', value: candidate.position ?? '—' },
      { label: 'Estado', value: candidate.status },
      { label: 'Registrado', value: new Date(candidate.created_at).toLocaleString('es-CO') },
    ].map(({ label, value }) => (
      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{label}</span>
        <span style={{ color: 'var(--text-1)', fontSize: 13 }}>{value}</span>
      </div>
    ))}
    {candidate.resume_url && (
      <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textAlign: 'center', display: 'block', marginTop: 8, textDecoration: 'none' }}>
        Ver CV
      </a>
    )}
  </div>
);
