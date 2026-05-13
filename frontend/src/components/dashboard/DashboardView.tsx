'use client';
import { useQuery } from '@tanstack/react-query';
import { candidateService } from '../../services/candidateService';
import { getStoredUser } from '../../lib/auth';
import { CandidateStatus } from '../../types';

const STATUS_COLORS: Record<CandidateStatus, string> = {
  pending:     '#fbbf24',
  interviewed: '#4f6ef7',
  hired:       '#34d399',
  rejected:    '#f87171',
};

const STATUS_LABELS: Record<CandidateStatus, string> = {
  pending:     'Pendientes',
  interviewed: 'Entrevistados',
  hired:       'Contratados',
  rejected:    'Rechazados',
};

export const DashboardView = () => {
  const user = getStoredUser();

  const { data } = useQuery({
    queryKey: ['candidates', 1, undefined],
    queryFn: () => candidateService.list(1, 1),
  });

  const statuses: CandidateStatus[] = ['pending', 'interviewed', 'hired', 'rejected'];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Bienvenido, {user?.full_name ?? 'Usuario'}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text-1)' }}>
            {data?.total ?? '—'}
          </div>
          <div className="stat-label">Total candidatos</div>
        </div>

        {statuses.map((s) => (
          <StatCard key={s} status={s} />
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 600, marginBottom: 16 }}>
          Actividad reciente
        </h2>
        <RecentCandidates />
      </div>
    </div>
  );
};

const StatCard = ({ status }: { status: CandidateStatus }) => {
  const { data } = useQuery({
    queryKey: ['candidates-count', status],
    queryFn: () => candidateService.list(1, 1, status),
  });

  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color: STATUS_COLORS[status] }}>
        {data?.total ?? '—'}
      </div>
      <div className="stat-label">{STATUS_LABELS[status]}</div>
    </div>
  );
};

const RecentCandidates = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['candidates-recent'],
    queryFn: () => candidateService.list(1, 5),
  });

  return (
    <div className="candidate-table-wrapper">
      <table className="candidate-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Cargo</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j}><div className="skeleton" /></td>
                  ))}
                </tr>
              ))
            : data?.items.map((c) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                    {c.first_name} {c.last_name}
                  </td>
                  <td>{c.position ?? '—'}</td>
                  <td>
                    <span className={`badge badge-${c.status}`}>
                      {{ pending: 'Pendiente', interviewed: 'Entrevistado', hired: 'Contratado', rejected: 'Rechazado' }[c.status]}
                    </span>
                  </td>
                  <td>{new Date(c.created_at).toLocaleDateString('es-CO')}</td>
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  );
};
