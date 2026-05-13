'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '../../services/candidateService';
import { Candidate, CandidateStatus } from '../../types';

const STATUS_LABELS: Record<CandidateStatus, string> = {
  pending: 'Pendiente',
  interviewed: 'Entrevistado',
  hired: 'Contratado',
  rejected: 'Rechazado',
};

const STATUS_COLORS: Record<CandidateStatus, string> = {
  pending: 'badge-pending',
  interviewed: 'badge-interviewed',
  hired: 'badge-hired',
  rejected: 'badge-rejected',
};

const StatusBadge = ({ status }: { status: CandidateStatus }) => (
  <span className={`badge ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
);

interface Props {
  onSelect?: (candidate: Candidate) => void;
}

export const CandidateTable = ({ onSelect }: Props) => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | undefined>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidates', page, statusFilter],
    queryFn: () => candidateService.list(page, 15, statusFilter),
    placeholderData: (prev) => prev,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CandidateStatus }) =>
      candidateService.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidates'] }),
  });

  const deleteCandidate = useMutation({
    mutationFn: (id: string) => candidateService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidates'] }),
  });

  if (isError) return <div className="table-error">Error al cargar candidatos.</div>;

  return (
    <div className="candidate-table-wrapper">
      <div className="table-toolbar">
        <h2>Candidatos</h2>
        <div className="filters">
          <select
            value={statusFilter ?? ''}
            onChange={(e) => {
              setStatusFilter((e.target.value as CandidateStatus) || undefined);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {(Object.keys(STATUS_LABELS) as CandidateStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-scroll">
        <table className="candidate-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Cargo</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j}><div className="skeleton" /></td>
                    ))}
                  </tr>
                ))
              : data?.items.map((c) => (
                  <tr key={c.id} onClick={() => onSelect?.(c)} className="table-row">
                    <td className="name-cell">
                      <span className="avatar">{c.first_name[0]}{c.last_name[0]}</span>
                      {c.first_name} {c.last_name}
                    </td>
                    <td>{c.email}</td>
                    <td>{c.position ?? '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{new Date(c.created_at).toLocaleDateString('es-CO')}</td>
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
                        onClick={() => { if (confirm('¿Eliminar candidato?')) deleteCandidate.mutate(c.id); }}
                        aria-label="Eliminar"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {data && (
        <div className="pagination">
          <span className="pagination-info">
            {data.total} candidatos — Página {data.page} de {data.totalPages}
          </span>
          <div className="pagination-controls">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={p === page ? 'active' : ''}
              >{p}</button>
            ))}
            <button onClick={() => setPage((p) => p + 1)} disabled={page === data.totalPages}>›</button>
          </div>
        </div>
      )}
    </div>
  );
};
