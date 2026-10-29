import { useState, type FC, type FormEvent } from 'react';
import logo from '../assets/logo.png';

interface AdminLoginProps {
  onLogin: (role: 'admin' | 'advisor') => Promise<void>;
  onBackToSite: () => void;
}

export const AdminLogin: FC<AdminLoginProps> = ({ onLogin, onBackToSite }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result: { error?: string; role?: 'admin' | 'advisor' } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No fue posible iniciar sesión.');
      }
      if (result.role !== 'admin' && result.role !== 'advisor') {
        throw new Error('El servidor devolvió un rol de usuario inválido.');
      }

      await onLogin(result.role);
    } catch (error) {
      console.error('Error iniciando sesión administrativa:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: '24px', background: 'linear-gradient(135deg, #102f59, #2468b3)' }}>
      <section style={{ width: '100%', maxWidth: '420px', padding: '32px', background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <img src={logo} alt="WD Travel" style={{ display: 'block', width: '150px', maxHeight: '75px', objectFit: 'contain', margin: '0 auto 24px' }} />
        <h1 style={{ marginBottom: '8px', color: '#173964', fontSize: '1.4rem', textAlign: 'center' }}>Acceso administrativo</h1>
        <p style={{ marginBottom: '22px', color: '#475569', textAlign: 'center' }}>Ingresa las credenciales de tu cuenta.</p>
        <form onSubmit={event => void handleSubmit(event)}>
          <label htmlFor="admin-email" style={{ display: 'block', marginBottom: '6px', color: '#374151', fontWeight: 700 }}>Correo electrónico</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            style={{ width: '100%', padding: '11px', borderRadius: '8px' }}
          />
          <label htmlFor="admin-password" style={{ display: 'block', margin: '16px 0 6px', color: '#374151', fontWeight: 700 }}>Contraseña</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
            style={{ width: '100%', padding: '11px', borderRadius: '8px' }}
          />
          {errorMessage && <p role="alert" style={{ marginTop: '10px', color: '#b91c1c' }}>{errorMessage}</p>}
          <button type="submit" disabled={isSubmitting} style={{ width: '100%', marginTop: '20px', padding: '12px 16px', border: 0, borderRadius: '8px', color: '#fff', background: '#2d60a8', fontWeight: 700, cursor: 'pointer' }}>
            {isSubmitting ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
        <button type="button" onClick={onBackToSite} style={{ display: 'block', margin: '18px auto 0', padding: '8px', border: 0, color: '#2d60a8', background: 'transparent', cursor: 'pointer' }}>
          Volver al sitio
        </button>
      </section>
    </main>
  );
};
