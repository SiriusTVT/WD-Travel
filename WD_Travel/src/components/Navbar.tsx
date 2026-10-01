import React from 'react';
import logo from '../assets/logo.png';

interface NavbarProps {
  currentTab: 'home' | 'admin';
  setCurrentTab: (tab: 'home' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: '#2D60A8', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <img src={logo} alt="WD Travel Logo" style={{ height: '45px', objectFit: 'contain', backgroundColor: '#fff', padding: '4px', borderRadius: '6px' }} />
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>WD Travel</h2>
      </div>
      <div style={{ display: 'flex', gap: '15px' }}>
        <button
          onClick={() => setCurrentTab('home')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: currentTab === 'home' ? '#E3B31D' : 'transparent', color: currentTab === 'home' ? '#2D60A8' : '#fff' }}
        >
          Cliente (Cotizar)
        </button>
        <button
          onClick={() => setCurrentTab('admin')}
          style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: currentTab === 'admin' ? '#E3B31D' : 'transparent', color: currentTab === 'admin' ? '#2D60A8' : '#fff' }}
        >
          Panel Administrador
        </button>
      </div>
    </nav>
  );
};