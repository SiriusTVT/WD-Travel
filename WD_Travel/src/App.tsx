import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { AdminLogin } from './pages/AdminLogin';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { type Booking } from './data/mockData';

const ADMIN_PATH = '/wdtraveladmin';

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [adminRole, setAdminRole] = useState<'admin' | 'advisor' | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const isAdminRoute = pathname.replace(/\/+$/, '') === ADMIN_PATH;

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setPathname(window.location.pathname);
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
    const handlePopState = () => setPathname(window.location.pathname);
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

  if (isAdminRoute && adminRole) {
    return (
      <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <Navbar
          currentTab="admin"
          onGoHome={() => navigate('/')}
          onAdminLogout={handleAdminLogout}
        />
        <Admin bookings={bookings} setBookings={setBookings} role={adminRole} />
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <AdminLogin
        onLogin={handleAdminLogin}
        onBackToSite={() => navigate('/')}
      />
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <Navbar currentTab="home" onGoHome={() => navigate('/')} />
      <Home onBookingSubmit={booking => setBookings(currentBookings => [booking, ...currentBookings])} />
    </div>
  );
}

export default App;
