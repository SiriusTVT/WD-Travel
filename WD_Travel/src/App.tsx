import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { MOCK_BOOKINGS, type Booking } from './data/mockData';

function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'admin'>('home');
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);

  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const response = await fetch('/api/quotes');
        if (!response.ok) {
          throw new Error(`La consulta respondió con estado ${response.status}.`);
        }

        const quotes: Booking[] = await response.json();
        setBookings(currentBookings => {
          const localBookings = currentBookings.filter(
            booking => !quotes.some(quote => quote.id === booking.id)
          );
          return [...quotes, ...localBookings];
        });
      } catch (error) {
        console.error('No fue posible cargar las cotizaciones desde MongoDB:', error);
      }
    };

    void loadQuotes();
  }, []);

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      {currentTab === 'home' ? <Home onBookingSubmit={booking => setBookings(currentBookings => [booking, ...currentBookings])} /> : <Admin bookings={bookings} setBookings={setBookings} />}
    </div>
  );
}

export default App;