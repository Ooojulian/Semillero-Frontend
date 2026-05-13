'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService, CandidateFilters } from '../../services/candidateService';
import { Candidate, CandidateStatus } from '../../types';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';

const STATUS_LABELS: Record<CandidateStatus, string> = {
  pending: 'Pendiente', interviewed: 'Entrevistado', hired: 'Contratado', rejected: 'Rechazado',
};
const STATUS_COLORS: Record<CandidateStatus, string> = {
  pending: 'badge-pending', interviewed: 'badge-interviewed', hired: 'badge-hired', rejected: 'badge-rejected',
};

const fmt = (n?: number) => n !== undefined ? `$${n.toLocaleString('es-CO')}` : '—';

interface Props { onSelect?: (c: Candidate) => void; }

export const CandidateTable = ({ onSelect }: Props) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CandidateFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidates', page, filters],
    queryFn: () => candidateService.list(page, 15, filters),
    placeholderData: (prev) => prev,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CandidateStatus }) =>
      candidateService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Estado actualizado');
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => candidateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Candidato eliminado');
    },
    onError: () => toast.error('Error al eliminar candidato'),
  });

  const applySearch = () => {
    setFilters((f) => ({ ...f, search: searchInput || undefined }));
    setPage(1);
  };

  if (isError) return <div className="table-error">Error al cargar candidatos.</div>;

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <div className="candidate-table-wrapper">
        <div className="table-toolbar">
          <h2>Candidatos <span style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 400 }}>({data?.total ?? 0})</span></h2>
          <div className="filters" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                placeholder="Buscar por nombre, cargo, ubicación..."
                style={{ width: 280, paddingRight: 36 }}
              />
              <button onClick={applySearch} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14 }}>
                ⌕
              </button>
            </div>
            <select
              value={filters.status ?? ''}
              onChange={(e) => { setFilters((f) => ({ ...f, status: (e.target.value as CandidateStatus) || undefined })); setPage(1); }}
              style={{ width: 'auto' }}
            >
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_LABELS) as CandidateStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            {(filters.search || filters.status) && (
              <button onClick={() => { setFilters({}); setSearchInput(''); setPage(1); }} style={{ color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                × Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="table-scroll">
          <table className="candidate-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cargo / Perfil</th>
                <th>Experiencia</th>
                <th>Salario esperado</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Fuente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      {Array.from({ length: 8 }).map((__, j) => <td key={j}><div className="skeleton" /></td>)}
                    </tr>
                  ))
                : data?.items.map((c) => (
                    <tr key={c.id} onClick={() => onSelect?.(c)} className="table-row">
                      <td className="name-cell">
                        <span className="avatar">{c.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</span>
                        {c.full_name}
                      </td>
                      <td>{c.position}</td>
                      <td>{c.experience_years !== undefined ? `${c.experience_years} años` : '—'}</td>
                      <td>{fmt(c.expected_salary)}</td>
                      <td>{c.location ?? '—'}</td>
                      <td><span className={`badge ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span></td>
                      <td>
                        <span className={`badge ${c.source === 'internal' ? 'badge-hired' : 'badge-pending'}`}>
                          {c.source === 'internal' ? 'Interno' : 'Web'}
                        </span>
                      </td>
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={c.status}
                          onChange={(e) => updateStatus.mutate({ id: c.id, status: e.target.value as CandidateStatus })}
                          className="status-select"
                        >
                          {(Object.keys(STATUS_LABELS) as CandidateStatus[]).map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        <button
                          className="btn-danger-sm"
                          onClick={() => { if (confirm('¿Eliminar candidato?')) deleteMutation.mutate(c.id); }}
                        >×</button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{data.total} candidatos — Página {data.page} de {data.totalPages}</span>
            <div className="pagination-controls">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={p === page ? 'active' : ''}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => p + 1)} disabled={page === data.totalPages}>›</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
