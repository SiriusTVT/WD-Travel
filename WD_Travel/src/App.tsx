import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';
import { MOCK_BOOKINGS, type Booking } from './data/mockData';

function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'admin'>('home');
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      {currentTab === 'home' ? <Home onBookingSubmit={booking => setBookings(currentBookings => [booking, ...currentBookings])} /> : <Admin bookings={bookings} setBookings={setBookings} />}
    </div>
  );
}

export default App;