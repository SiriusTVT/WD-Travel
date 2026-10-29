import { useState, type FC, type FormEvent } from 'react';
import logo from '../assets/logo.png';

interface AdminLoginProps {
  onLogin: () => Promise<void>;
  onBackToSite: () => void;
}

export const AdminLogin: FC<AdminLoginProps> = ({ onLogin, onBackToSite }) => {
  const [accessCode, setAccessCode] = useState('');
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
        body: JSON.stringify({ code: accessCode })
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No fue posible iniciar sesión.');
      }

      await onLogin();
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
        <p style={{ marginBottom: '22px', color: '#475569', textAlign: 'center' }}>Ingresa el código de acceso para continuar.</p>
        <form onSubmit={event => void handleSubmit(event)}>
          <label htmlFor="admin-access-code" style={{ display: 'block', marginBottom: '6px', color: '#374151', fontWeight: 700 }}>Código de acceso</label>
          <input
            id="admin-access-code"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={accessCode}
            onChange={event => setAccessCode(event.target.value)}
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
