import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { type Booking } from './data/mockData';

function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'admin'>('home');
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [quotesResponse, salesResponse] = await Promise.allSettled([
          fetch('/api/quotes'),
          fetch('/api/sales')
        ]);

        let quotes: Booking[] = [];
        let sales: Booking[] = [];

        if (quotesResponse.status === 'fulfilled' && quotesResponse.value.ok) {
          quotes = await quotesResponse.value.json();
        }
        if (salesResponse.status === 'fulfilled' && salesResponse.value.ok) {
          sales = await salesResponse.value.json();
        }

        const dbItems = [...quotes, ...sales];
        setBookings(dbItems);
      } catch (error) {
        console.error('No fue posible cargar los datos desde MongoDB:', error);
      }
    };

    void loadData();
  }, []);

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      {currentTab === 'home' ? (
        <Home onBookingSubmit={booking => setBookings(currentBookings => [booking, ...currentBookings])} />
      ) : (
        <Admin bookings={bookings} setBookings={setBookings} />
      )}
    </div>
  );
}

export default App;