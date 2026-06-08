'use client';
import { useState, useRef, useEffect } from 'react';
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

type Step = 'loading' | 'notfound' | 'form' | 'success';

interface FormData {
  full_name: string; email: string; phone: string;
  experience_years: string; expected_salary: string;
  location: string; profile_url: string; cover_letter: string;
}

const EMPTY: FormData = {
  full_name: '', email: '', phone: '',
  experience_years: '', expected_salary: '',
  location: '', profile_url: '', cover_letter: '',
};

export const ApplyVacancyForm = ({ vacancyId }: { vacancyId: string }) => {
  const [step, setStep] = useState<Step>('loading');
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    fetch(`/api/apply/vacancy/${vacancyId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) { setVacancy(data as Vacancy); setStep('form'); }
        else setStep('notfound');
      })
      .catch(() => setStep('notfound'));
  }, [vacancyId]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) { setError('El CV no puede superar 10MB'); return; }
    setResumeFile(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let resume_url: string | undefined;
      if (resumeFile) {
        const fd = new FormData();
        fd.append('file', resumeFile);
        const uploadRes = await fetch('/api/apply/upload', { method: 'POST', body: fd });
        if (!uploadRes.ok) throw new Error('No se pudo subir el CV. Intenta de nuevo.');
        const { url } = await uploadRes.json() as { url: string };
        resume_url = url;
      }
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          position: vacancy!.title,
          experience_years: form.experience_years ? Number(form.experience_years) : undefined,
          expected_salary: form.expected_salary ? Number(form.expected_salary) : undefined,
          location: form.location || undefined,
          profile_url: form.profile_url || undefined,
          cover_letter: form.cover_letter || undefined,
          vacancy_id: vacancyId,
          resume_url,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar la aplicación');
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'loading') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: `bounce .9s ${i * 0.15}s infinite` }} />)}
      </div>
    </div>
  );

  if (step === 'notfound') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 12 }}>Vacante no encontrada</h1>
        <p style={{ color: 'var(--text-3)', marginBottom: 24 }}>Esta vacante no existe o ya fue cerrada.</p>
        <Link href="/apply" style={{ padding: '10px 20px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: 'var(--text-inv)', fontWeight: 600, fontSize: 13 }}>
          Ver otras vacantes
        </Link>
      </div>
    </div>
  );

  if (step === 'success') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 24px', background: 'rgba(93,184,122,.12)', border: '2px solid var(--green)', display: 'grid', placeItems: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: 12 }}>¡Aplicación enviada!</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
          Hola <strong style={{ color: 'var(--text-1)' }}>{form.full_name}</strong>, recibimos tu aplicación para{' '}
          <strong style={{ color: 'var(--accent)' }}>{vacancy?.title}</strong>{vacancy?.company ? ` en ${vacancy.company}` : ''}.
        </p>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 28 }}>
          {form.email ? 'Te notificaremos por email cuando haya novedades. ' : ''}Normalmente respondemos en menos de 72 horas.
        </p>
        <Link href="/apply" style={{ padding: '10px 20px', borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', fontWeight: 600, fontSize: 13 }}>
          Ver otras vacantes →
        </Link>
      </div>
    </div>
  );

  const salary = fmtRange(vacancy?.salary_min, vacancy?.salary_max);

  return (
    <div className="apply-page">
      <div className="apply-split">
        {/* Lado izquierdo — info de la vacante */}
        <aside className="apply-aside">
          <div className="apply-aside-inner">
            <div className="apply-logo">
              <div className="auth-logo-icon">S</div>
              <span className="auth-logo-name">Semillero</span>
            </div>

            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                {vacancy?.company}
              </p>
              <h1 style={{ fontSize: 'clamp(1.8rem,3vw,2.6rem)', lineHeight: 1.1, marginBottom: 16 }}>
                {vacancy?.title}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {vacancy?.location && (
                  <span style={{ fontSize: 13, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {vacancy.location}
                  </span>
                )}
                {vacancy?.modality && (
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>· {MODALITY_LABELS[vacancy.modality]}</span>
                )}
                {salary && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>· {salary}</span>}
                {vacancy?.experience_years_min && vacancy.experience_years_min > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>· {vacancy.experience_years_min}+ años exp.</span>
                )}
              </div>

              {vacancy?.description && (
                <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.7 }}>{vacancy.description}</p>
              )}
            </div>

            {vacancy?.skills && vacancy.skills.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--text-3)', marginBottom: 10 }}>Skills requeridos</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {vacancy.skills.map((s) => (
                    <span key={s} style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 4, background: 'var(--surface-3)', border: '1px solid var(--border-2)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {vacancy?.deadline && (
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 'auto' }}>
                Fecha límite: {new Date(vacancy.deadline).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </aside>

        {/* Lado derecho — formulario */}
        <main className="apply-main">
          <div className="apply-form-wrapper">
            <h2 style={{ marginBottom: 4 }}>Tu aplicación</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 28 }}>
              Los campos con <span style={{ color: 'var(--accent)' }}>*</span> son obligatorios
            </p>
            {error && <div className="form-error" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <fieldset className="apply-fieldset">
                <legend>Datos personales</legend>
                <div className="apply-grid-2">
                  <div className="form-group">
                    <label>Nombre completo <span style={{ color: 'var(--accent)' }}>*</span></label>
                    <input value={form.full_name} onChange={set('full_name')} placeholder="Juan García" required minLength={2} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={set('email')} placeholder="juan@email.com" />
                  </div>
                  <div className="form-group">
                    <label>Teléfono / WhatsApp</label>
                    <input value={form.phone} onChange={set('phone')} placeholder="+57 300 000 0000" />
                  </div>
                  <div className="form-group">
                    <label>Ciudad</label>
                    <input value={form.location} onChange={set('location')} placeholder="Bogotá" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="apply-fieldset">
                <legend>Perfil profesional</legend>
                <div className="apply-grid-2">
                  <div className="form-group">
                    <label>Años de experiencia</label>
                    <input type="number" min={0} value={form.experience_years} onChange={set('experience_years')} placeholder="3" />
                  </div>
                  <div className="form-group">
                    <label>Aspiración salarial (COP)</label>
                    <input type="number" min={0} value={form.expected_salary} onChange={set('expected_salary')} placeholder="4500000" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>LinkedIn u otra red profesional</label>
                    <input type="url" value={form.profile_url} onChange={set('profile_url')} placeholder="https://linkedin.com/in/tu-perfil" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="apply-fieldset">
                <legend>Documentos</legend>
                <div className="form-group">
                  <label>CV / Hoja de vida</label>
                  <div className="apply-upload" onClick={() => fileRef.current?.click()} role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}>
                    {resumeFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{resumeFile.name}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setResumeFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                          style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 16 }}>×</button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 2 }}>Haz click para subir tu CV</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>PDF o Word · máx 10MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFile} style={{ display: 'none' }} />
                </div>
                <div className="form-group">
                  <label>¿Por qué quieres este cargo? (opcional)</label>
                  <textarea value={form.cover_letter} onChange={set('cover_letter')}
                    placeholder={`Cuéntanos qué te motiva a aplicar a ${vacancy?.title ?? 'este cargo'}...`}
                    rows={3} maxLength={1500} style={{ resize: 'vertical' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{form.cover_letter.length}/1500</span>
                </div>
              </fieldset>

              <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '13px' }}>
                {loading ? 'Enviando...' : `Aplicar a ${vacancy?.title ?? 'este cargo'} →`}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                <Link href="/apply">← Ver todas las vacantes</Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};
