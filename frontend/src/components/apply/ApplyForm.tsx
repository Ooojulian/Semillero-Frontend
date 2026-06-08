'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

type Step = 'form' | 'success';

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  experience_years: string;
  expected_salary: string;
  location: string;
  profile_url: string;
  cover_letter: string;
}

const EMPTY: FormData = {
  full_name: '', email: '', phone: '', position: '',
  experience_years: '', expected_salary: '', location: '',
  profile_url: '', cover_letter: '',
};

export const ApplyForm = () => {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>(EMPTY);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

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

      // Subir CV si hay archivo
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
          position: form.position,
          experience_years: form.experience_years ? Number(form.experience_years) : undefined,
          expected_salary: form.expected_salary ? Number(form.expected_salary) : undefined,
          location: form.location || undefined,
          profile_url: form.profile_url || undefined,
          cover_letter: form.cover_letter || undefined,
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

  if (step === 'success') return <SuccessScreen name={form.full_name} position={form.position} />;

  return (
    <div className="apply-page">
      <div className="apply-split">
        {/* Panel izquierdo — branding */}
        <aside className="apply-aside">
          <div className="apply-aside-inner">
            <div className="apply-logo">
              <div className="auth-logo-icon">S</div>
              <span className="auth-logo-name">Semillero</span>
            </div>
            <div className="apply-headline">
              <h1>Haz parte<br /><em>del equipo.</em></h1>
              <p>Postúlate y un reclutador revisará tu perfil. El proceso es ágil — normalmente te contactamos en menos de 72 horas.</p>
            </div>
            <div className="apply-steps">
              {[
                { n: '01', label: 'Llena el formulario', desc: 'Cuéntanos quién eres y a qué quieres aplicar.' },
                { n: '02', label: 'Revisamos tu perfil', desc: 'Nuestro equipo lo evalúa con apoyo de IA.' },
                { n: '03', label: 'Te contactamos', desc: 'Si hay match, agendamos una primera llamada.' },
              ].map((s) => (
                <div key={s.n} className="apply-step">
                  <span className="apply-step-n">{s.n}</span>
                  <div>
                    <p className="apply-step-label">{s.label}</p>
                    <p className="apply-step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Panel derecho — formulario */}
        <main className="apply-main">
          <div className="apply-form-wrapper">
            <h2 style={{ marginBottom: 4 }}>Tu aplicación</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 28 }}>
              Los campos marcados con <span style={{ color: 'var(--accent)' }}>*</span> son obligatorios
            </p>

            {error && <div className="form-error" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Datos personales */}
              <fieldset className="apply-fieldset">
                <legend>Datos personales</legend>
                <div className="apply-grid-2">
                  <div className="form-group">
                    <label htmlFor="full_name">Nombre completo <span style={{ color: 'var(--accent)' }}>*</span></label>
                    <input id="full_name" value={form.full_name} onChange={set('full_name')}
                      placeholder="Juan García" required minLength={2} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Correo electrónico</label>
                    <input id="email" type="email" value={form.email} onChange={set('email')}
                      placeholder="juan@email.com" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Teléfono / WhatsApp</label>
                    <input id="phone" value={form.phone} onChange={set('phone')}
                      placeholder="+57 300 000 0000" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="location">Ciudad</label>
                    <input id="location" value={form.location} onChange={set('location')}
                      placeholder="Bogotá, Colombia" />
                  </div>
                </div>
              </fieldset>

              {/* Perfil profesional */}
              <fieldset className="apply-fieldset">
                <legend>Perfil profesional</legend>
                <div className="apply-grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="position">Cargo al que aplicas <span style={{ color: 'var(--accent)' }}>*</span></label>
                    <input id="position" value={form.position} onChange={set('position')}
                      placeholder="Desarrollador Frontend React" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="experience_years">Años de experiencia</label>
                    <input id="experience_years" type="number" min={0} max={50}
                      value={form.experience_years} onChange={set('experience_years')}
                      placeholder="3" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="expected_salary">Aspiración salarial (COP)</label>
                    <input id="expected_salary" type="number" min={0}
                      value={form.expected_salary} onChange={set('expected_salary')}
                      placeholder="4500000" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="profile_url">LinkedIn u otra red profesional</label>
                    <input id="profile_url" type="url" value={form.profile_url} onChange={set('profile_url')}
                      placeholder="https://linkedin.com/in/tu-perfil" />
                  </div>
                </div>
              </fieldset>

              {/* CV y carta */}
              <fieldset className="apply-fieldset">
                <legend>Documentos</legend>
                <div className="form-group">
                  <label>CV / Hoja de vida</label>
                  <div className="apply-upload" onClick={() => fileRef.current?.click()}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                    aria-label="Subir CV">
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
                        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 2 }}>Arrastra tu CV o haz click para subir</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>PDF o Word · máx 10MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFile} style={{ display: 'none' }} />
                </div>

                <div className="form-group">
                  <label htmlFor="cover_letter">Carta de presentación (opcional)</label>
                  <textarea id="cover_letter" value={form.cover_letter} onChange={set('cover_letter')}
                    placeholder="Cuéntanos brevemente por qué eres el candidato ideal para este cargo..."
                    rows={4} maxLength={1500}
                    style={{ resize: 'vertical' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{form.cover_letter.length}/1500</span>
                </div>
              </fieldset>

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ marginTop: 4, padding: '13px' }}>
                {loading ? 'Enviando aplicación...' : 'Enviar aplicación →'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" style={{ color: 'var(--accent)' }}>Inicia sesión</Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

const SuccessScreen = ({ name, position }: { name: string; position: string }) => (
  <div className="apply-page" style={{ display: 'grid', placeItems: 'center' }}>
    <div style={{ maxWidth: 460, padding: '0 24px', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', margin: '0 auto 24px',
        background: 'rgba(93,184,122,.12)', border: '2px solid var(--green)',
        display: 'grid', placeItems: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h1 style={{ fontSize: '2rem', marginBottom: 12 }}>¡Aplicación enviada!</h1>
      <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
        Hola <strong style={{ color: 'var(--text-1)' }}>{name}</strong>, recibimos tu aplicación para{' '}
        <strong style={{ color: 'var(--accent)' }}>{position}</strong>.
      </p>
      <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 32 }}>
        Nuestro equipo la revisará y te contactará si hay un match. Normalmente respondemos en menos de 72 horas.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/apply" style={{
          padding: '10px 20px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
          background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)',
        }}>
          Aplicar a otro cargo
        </a>
      </div>
    </div>
  </div>
);
