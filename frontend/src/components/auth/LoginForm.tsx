'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../services/authService';
import { setStoredUser } from '../../lib/auth';

export const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { accessToken, refreshToken, user } = await authService.login(email, password);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setStoredUser(user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
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

        <h2>Bienvenido</h2>
        <p className="subtitle">Inicia sesión para continuar</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
};
