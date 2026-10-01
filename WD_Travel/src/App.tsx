import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Admin } from './pages/Admin';

function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'admin'>('home');

  return (
    <div style={{ backgroundColor: '#f5f7fa', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      {currentTab === 'home' ? <Home /> : <Admin />}
    </div>
  );
}

export default App;