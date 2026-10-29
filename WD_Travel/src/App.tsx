import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { AdminLogin } from './pages/AdminLogin';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { type Booking } from './data/mockData';

const ADMIN_PATH = '/wdtraveladmin';

function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const isAdminRoute = pathname.replace(/\/+$/, '') === ADMIN_PATH;

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setPathname(window.location.pathname);
  }, []);

  const loadAdminData = useCallback(async () => {
    const [quotesResponse, salesResponse] = await Promise.all([
      fetch('/api/quotes'),
      fetch('/api/sales')
    ]);

    if (!quotesResponse.ok || !salesResponse.ok) {
      throw new Error('No fue posible cargar los datos administrativos desde el servidor.');
    }

    const [quotes, sales]: [Booking[], Booking[]] = await Promise.all([
      quotesResponse.json(),
      salesResponse.json()
    ]);
    setBookings([...quotes, ...sales]);
  }, []);

  const handleAdminLogin = useCallback(async () => {
    await loadAdminData();
    setIsAdmin(true);
  }, [loadAdminData]);

  const handleAdminLogout = useCallback(async () => {
    const response = await fetch('/api/admin/logout', { method: 'POST' });
    if (!response.ok) {
      throw new Error('No fue posible cerrar la sesión administrativa.');
    }
    setIsAdmin(false);
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
          if (isMounted) setIsAdmin(false);
          return;
        }
        if (!response.ok) {
          throw new Error('No fue posible comprobar la sesión administrativa.');
        }

        await loadAdminData();
        if (isMounted) setIsAdmin(true);
      } catch (error) {
        console.error('No fue posible restaurar la sesión administrativa:', error);
      }
    };

    void restoreAdminSession();
    return () => {
      isMounted = false;
    };
  }, [isAdminRoute, loadAdminData]);

  if (isAdminRoute && !isAdmin) {
    return (
      <AdminLogin
        onLogin={handleAdminLogin}
        onBackToSite={() => navigate('/')}
      />
    );
  }

  if (isAdminRoute) {
    return (
      <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
        <Navbar
          currentTab="admin"
          onGoHome={() => navigate('/')}
          onAdminLogout={handleAdminLogout}
        />
        <Admin bookings={bookings} setBookings={setBookings} />
      </div>
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
