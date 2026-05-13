'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../services/authService';

export const RegisterForm = () => {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'candidate' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.register(form.email, form.password, form.full_name, form.role);
      router.push('/login?registered=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">S</div>
          <span className="auth-logo-name">Semillero</span>
        </div>

        <h2>Crear cuenta</h2>
        <p className="subtitle">Únete a la plataforma</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre completo</label>
            <input type="text" value={form.full_name} onChange={set('full_name')} placeholder="Juan Pérez" required minLength={2} />
          </div>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="tu@email.com" required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="Mínimo 8 caracteres" required minLength={8} />
          </div>
          <div className="form-group">
            <label>Rol</label>
            <select value={form.role} onChange={set('role')}>
              <option value="candidate">Candidato</option>
              <option value="recruiter">Reclutador</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
};
