import { useEffect, useState, type FC, type FormEvent } from 'react';
import logo from '../assets/logo.png';

interface CreateCountProps {
  onBackToSite: () => void;
}

export const CreateCount: FC<CreateCountProps> = ({ onBackToSite }) => {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [secret, setSecret] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'admin' | 'advisor'>('advisor');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const response = await fetch('/api/createcount/session');
        if (response.status !== 401 && !response.ok) {
          throw new Error('No fue posible verificar la autorización.');
        }
        if (isMounted) setIsAuthorized(response.ok);
      } catch (error) {
        console.error('Error verificando acceso a creación de cuentas:', error);
        if (isMounted) {
          setErrorMessage('No fue posible verificar el acceso. Recarga la página para intentarlo nuevamente.');
        }
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    };

    void checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/createcount/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret })
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No fue posible validar el código.');
      }

      setSecret('');
      setIsAuthorized(true);
    } catch (error) {
      console.error('Error validando código de creación de cuentas:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible validar el código.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      setSuccessMessage('');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/createcount/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const result: { error?: string; email?: string; role?: 'admin' | 'advisor' } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No fue posible crear la cuenta.');
      }
      if (!result.email || (result.role !== 'admin' && result.role !== 'advisor')) {
        throw new Error('El servidor devolvió una respuesta inválida al crear la cuenta.');
      }

      const roleLabel = result.role === 'admin' ? 'Administrador' : 'Asesor';
      setSuccessMessage(`Cuenta creada para ${result.email} con rol ${roleLabel}.`);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRole('advisor');
    } catch (error) {
      console.error('Error creando cuenta de usuario:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLock = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/createcount/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('No fue posible cerrar el acceso de creación de cuentas.');
      }
      setIsAuthorized(false);
      setSuccessMessage('');
    } catch (error) {
      console.error('Error cerrando acceso de creación de cuentas:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible cerrar el acceso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: '24px', background: 'linear-gradient(135deg, #102f59, #2468b3)' }}>
      <section style={{ width: '100%', maxWidth: '480px', padding: '32px', background: '#fff', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <img src={logo} alt="WD Travel" style={{ display: 'block', width: '150px', maxHeight: '75px', objectFit: 'contain', margin: '0 auto 24px' }} />
        <h1 style={{ marginBottom: '8px', color: '#173964', fontSize: '1.4rem', textAlign: 'center' }}>Gestión de cuentas</h1>
        <p style={{ marginBottom: '24px', color: '#475569', textAlign: 'center' }}>
          {isAuthorized ? 'Registra una cuenta de administrador o asesor.' : 'Ingresa el código secreto para continuar.'}
        </p>

        {isCheckingSession ? (
          <p role="status" style={{ color: '#475569', textAlign: 'center' }}>Verificando autorización...</p>
        ) : isAuthorized ? (
          <>
            <form onSubmit={event => void handleCreateAccount(event)}>
              <label htmlFor="create-account-email" style={{ display: 'block', marginBottom: '6px', color: '#374151', fontWeight: 700 }}>Correo</label>
              <input
                id="create-account-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                style={{ width: '100%', padding: '11px', borderRadius: '8px' }}
              />
              <label htmlFor="create-account-password" style={{ display: 'block', margin: '16px 0 6px', color: '#374151', fontWeight: 700 }}>Contraseña</label>
              <input
                id="create-account-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                required
                value={password}
                onChange={event => setPassword(event.target.value)}
                style={{ width: '100%', padding: '11px', borderRadius: '8px' }}
              />
              <label htmlFor="create-account-confirm-password" style={{ display: 'block', margin: '16px 0 6px', color: '#374151', fontWeight: 700 }}>Confirmar contraseña</label>
              <input
                id="create-account-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                required
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                style={{ width: '100%', padding: '11px', borderRadius: '8px' }}
              />
              <button
                type="button"
                aria-pressed={showPassword}
                onClick={() => setShowPassword(current => !current)}
                style={{ marginTop: '8px', padding: '6px 0', border: 0, color: '#2d60a8', background: 'transparent', fontWeight: 700, cursor: 'pointer' }}
              >
                {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              </button>
              <label htmlFor="create-account-role" style={{ display: 'block', margin: '16px 0 6px', color: '#374151', fontWeight: 700 }}>Rol</label>
              <select
                id="create-account-role"
                value={role}
                onChange={event => setRole(event.target.value as 'admin' | 'advisor')}
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff' }}
              >
                <option value="admin">Administrador</option>
                <option value="advisor">Asesor</option>
              </select>
              <button type="submit" disabled={isSubmitting} style={{ width: '100%', marginTop: '22px', padding: '12px 16px', border: 0, borderRadius: '8px', color: '#fff', background: '#2d60a8', fontWeight: 700, cursor: 'pointer' }}>
                {isSubmitting ? 'Guardando...' : 'Crear cuenta'}
              </button>
            </form>
            <button type="button" disabled={isSubmitting} onClick={() => void handleLock()} style={{ display: 'block', margin: '12px auto 0', padding: '8px', border: 0, color: '#475569', background: 'transparent', cursor: 'pointer' }}>
              Cerrar acceso
            </button>
          </>
        ) : (
          <form onSubmit={event => void handleUnlock(event)}>
            <label htmlFor="create-count-secret" style={{ display: 'block', marginBottom: '6px', color: '#374151', fontWeight: 700 }}>Código secreto</label>
            <input
              id="create-count-secret"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={secret}
              onChange={event => setSecret(event.target.value)}
              style={{ width: '100%', padding: '11px', borderRadius: '8px' }}
            />
            <button type="submit" disabled={isSubmitting} style={{ width: '100%', marginTop: '20px', padding: '12px 16px', border: 0, borderRadius: '8px', color: '#fff', background: '#2d60a8', fontWeight: 700, cursor: 'pointer' }}>
              {isSubmitting ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        )}

        {errorMessage && <p role="alert" style={{ marginTop: '14px', color: '#b91c1c' }}>{errorMessage}</p>}
        {successMessage && <p role="status" style={{ marginTop: '14px', color: '#15803d' }}>{successMessage}</p>}
        <button type="button" onClick={onBackToSite} style={{ display: 'block', margin: '18px auto 0', padding: '8px', border: 0, color: '#2d60a8', background: 'transparent', cursor: 'pointer' }}>
          Volver al sitio
        </button>
      </section>
    </main>
  );
};
