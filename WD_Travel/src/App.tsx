import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { type Booking } from './data/mockData';

// Las rutas administrativas se cargan solo cuando se necesitan, para no
// descargar su código en la página pública.
const AdminLogin = lazy(() => import('./pages/AdminLogin').then(module => ({ default: module.AdminLogin })));
const CreateCount = lazy(() => import('./pages/CreateCount').then(module => ({ default: module.CreateCount })));
const Admin = lazy(() => import('./pages/Admin').then(module => ({ default: module.Admin })));

const ADMIN_PATH = '/wdtraveladmin';
// Tiempo sin actividad (o con la pestaña oculta) antes de cerrar la sesión administrativa.
const ADMIN_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const ADMIN_HEARTBEAT_MS = 60 * 1000;
const ADMIN_IDLE_CHECK_MS = 15 * 1000;
const CREATE_COUNT_PATH = '/createcount';
const PRIVACY_PATH = '/politica-de-privacidad';

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [adminRole, setAdminRole] = useState<'admin' | 'advisor' | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const isAdminRoute = normalizedPath === ADMIN_PATH;
  const isCreateCountRoute = normalizedPath === CREATE_COUNT_PATH;
  const isPrivacyRoute = normalizedPath === PRIVACY_PATH;

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setPathname(window.location.pathname);
    if (path.replace(/\/+$/, '') !== ADMIN_PATH) {
      setAdminRole(null);
      setBookings([]);
    }
  }, []);

  const loadAdminData = useCallback(async (role: 'admin' | 'advisor') => {
    const quotesResponse = await fetch('/api/quotes');
    if (!quotesResponse.ok) {
      throw new Error('No fue posible cargar las cotizaciones desde el servidor.');
    }

    const quotes: Booking[] = await quotesResponse.json();
    let sales: Booking[] = [];
    if (role === 'admin') {
      const salesResponse = await fetch('/api/sales');
      if (!salesResponse.ok) {
        throw new Error('No fue posible cargar las ventas desde el servidor.');
      }
      sales = await salesResponse.json();
    }

    setBookings([...quotes, ...sales]);
  }, []);

  const handleAdminLogin = useCallback(async (role: 'admin' | 'advisor') => {
    await loadAdminData(role);
    setAdminRole(role);
  }, [loadAdminData]);

  const handleAdminLogout = useCallback(async () => {
    const response = await fetch('/api/admin/logout', { method: 'POST' });
    if (!response.ok) {
      throw new Error('No fue posible cerrar la sesión administrativa.');
    }
    setAdminRole(null);
    setBookings([]);
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const handlePopState = () => {
      const nextPathname = window.location.pathname;
      setPathname(nextPathname);
      if (nextPathname.replace(/\/+$/, '') !== ADMIN_PATH) {
        setAdminRole(null);
        setBookings([]);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!isAdminRoute) return;

    let isMounted = true;
    const restoreAdminSession = async () => {
      try {
        const response = await fetch('/api/admin/session');
        if (response.status === 401) {
          if (isMounted) setAdminRole(null);
          return;
        }
        if (!response.ok) {
          throw new Error('No fue posible comprobar la sesión administrativa.');
        }

        const session: { role?: 'admin' | 'advisor' } = await response.json();
        if (session.role !== 'admin' && session.role !== 'advisor') {
          throw new Error('El servidor devolvió un rol de usuario inválido.');
        }
        await loadAdminData(session.role);
        if (isMounted) setAdminRole(session.role);
      } catch (error) {
        console.error('No fue posible restaurar la sesión administrativa:', error);
      }
    };

    void restoreAdminSession();
    return () => {
      isMounted = false;
    };
  }, [isAdminRoute, loadAdminData]);

  useEffect(() => {
    if (!isAdminRoute || !adminRole) return;

    let lastActivity = Date.now();
    let lastHeartbeat = Date.now();
    let hiddenSince: number | null = document.hidden ? Date.now() : null;

    const markActive = () => {
      lastActivity = Date.now();
    };
    const handleVisibilityChange = () => {
      hiddenSince = document.hidden ? Date.now() : null;
      if (!document.hidden) markActive();
    };
    const activityEvents = ['pointerdown', 'keydown', 'scroll'] as const;
    activityEvents.forEach(eventName => window.addEventListener(eventName, markActive, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const checkIdle = window.setInterval(() => {
      const now = Date.now();
      const idleFor = hiddenSince === null ? now - lastActivity : now - hiddenSince;

      if (idleFor >= ADMIN_IDLE_TIMEOUT_MS) {
        window.clearInterval(checkIdle);
        void handleAdminLogout().catch(error => console.error('No fue posible cerrar la sesión por inactividad:', error));
        window.alert('La sesión administrativa se cerró por inactividad.');
        return;
      }

      // Mientras la persona esté activa, se renueva la sesión en el servidor.
      if (now - lastHeartbeat >= ADMIN_HEARTBEAT_MS) {
        lastHeartbeat = now;
        void fetch('/api/admin/session').then(response => {
          if (response.status === 401) {
            setAdminRole(null);
            setBookings([]);
            navigate('/');
          }
        }).catch(error => console.error('No fue posible renovar la sesión administrativa:', error));
      }
    }, ADMIN_IDLE_CHECK_MS);

    return () => {
      window.clearInterval(checkIdle);
      activityEvents.forEach(eventName => window.removeEventListener(eventName, markActive));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAdminRoute, adminRole, handleAdminLogout, navigate]);

  if (isPrivacyRoute) {
    return <PrivacyPolicy onBackToSite={() => navigate('/')} />;
  }

  if (isCreateCountRoute) {
    return (
      <Suspense fallback={null}>
        <CreateCount onBackToSite={() => navigate('/')} />
      </Suspense>
    );
  }

  if (isAdminRoute && adminRole) {
    return (
      <div style={{ background: 'var(--wd-sky)', minHeight: '100vh' }}>
        <Navbar
          currentTab="admin"
          onGoHome={() => navigate('/')}
          onAdminLogout={handleAdminLogout}
        />
        <Suspense fallback={null}>
          <Admin bookings={bookings} setBookings={setBookings} role={adminRole} />
        </Suspense>
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <Suspense fallback={null}>
        <AdminLogin
          onLogin={handleAdminLogin}
          onBackToSite={() => navigate('/')}
        />
      </Suspense>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar currentTab="home" onGoHome={() => navigate('/')} />
      <Home onBookingSubmit={booking => setBookings(currentBookings => [booking, ...currentBookings])} />
    </div>
  );
}

export default App;
