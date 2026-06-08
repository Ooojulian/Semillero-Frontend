'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Vacancy } from '../../types';

const MODALITY_LABELS = { presencial: 'Presencial', remoto: 'Remoto', 'híbrido': 'Híbrido' };
const fmt = (n?: number) => n !== undefined ? `$${n.toLocaleString('es-CO')}` : '';
const fmtRange = (min?: number, max?: number) => {
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `Desde ${fmt(min)}`;
  if (max) return `Hasta ${fmt(max)}`;
  return null;
};

export const ApplyLanding = () => {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/apply/vacancies')
      .then((r) => r.json())
      .then((data) => setVacancies(data as Vacancy[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '18px 40px',
        display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0,
        background: 'var(--surface)', zIndex: 10,
      }}>
        <div className="auth-logo-icon">S</div>
        <span className="auth-logo-name">Semillero</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>· Vacantes</span>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '52px 24px' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', marginBottom: 12 }}>
            Trabaja con<br /><em>los mejores.</em>
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
            Revisamos tu perfil y te conectamos con la empresa indicada. El proceso es directo y ágil.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, height: 160 }}>
                <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 12, width: '80%' }} />
              </div>
            ))}
          </div>
        ) : vacancies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 15, color: 'var(--text-2)' }}>No hay vacantes abiertas en este momento</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Vuelve pronto — publicamos nuevas posiciones regularmente</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
              {vacancies.length} vacante{vacancies.length !== 1 ? 's' : ''} disponible{vacancies.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {vacancies.map((v) => {
                const salary = fmtRange(v.salary_min, v.salary_max);
                return (
                  <Link key={v.id} href={`/apply/${v.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)', padding: '20px 24px',
                      display: 'flex', alignItems: 'center', gap: 20,
                      transition: 'border-color 150ms, transform 150ms',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                        (e.currentTarget as HTMLDivElement).style.transform = 'none';
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 15, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--text-1)' }}>
                            {v.title}
                          </h3>
                          <span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>{v.company}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {v.location && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{v.location}</span>}
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· {MODALITY_LABELS[v.modality]}</span>
                          {salary && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· {salary}</span>}
                          {v.experience_years_min && v.experience_years_min > 0
                            ? <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· {v.experience_years_min}+ años</span>
                            : null}
                        </div>
                        {v.skills && v.skills.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                            {v.skills.slice(0, 4).map((s) => (
                              <span key={s} style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 3, background: 'var(--surface-3)', border: '1px solid var(--border-2)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{s}</span>
                            ))}
                            {v.skills.length > 4 && <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>+{v.skills.length - 4}</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        {v.deadline && (
                          <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                            Cierra {new Date(v.deadline).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        <span style={{
                          padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 12.5, fontWeight: 700,
                          background: 'var(--accent)', color: 'var(--text-inv)', whiteSpace: 'nowrap',
                        }}>
                          Aplicar →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
