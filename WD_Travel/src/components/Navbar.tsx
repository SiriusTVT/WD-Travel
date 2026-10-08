import React from 'react';
import logo from '../assets/logo.png';

const socialLinks = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/w.d.travel3?igsh=MW80enJqZTdnanp1NQ%3D%3D',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/@wdtravel6?_r=1&_t=ZS-94le7Y8Db3i',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 4v10.2a4.8 4.8 0 1 1-4.1-4.75v2.7a2.1 2.1 0 1 0 1.4 1.98V4H15Z" fill="currentColor" />
        <path d="M15 4c.3 1.7 1.25 2.72 3 3.05v2.45c-1.1-.08-2.1-.42-3-1.02V4Z" fill="currentColor" opacity=".65" />
      </svg>
    ),
  },
];

interface NavbarProps {
  currentTab: 'home' | 'admin';
  setCurrentTab: (tab: 'home' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', background: 'linear-gradient(110deg, #102f59, #2468b3)', color: '#fff', boxShadow: '0 4px 16px rgba(16,47,89,0.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <img src={logo} alt="WD Travel Logo" style={{ height: '45px', objectFit: 'contain', backgroundColor: '#fff', padding: '4px', borderRadius: '6px' }} />
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>WD Travel</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} aria-label="Redes sociales">
          {socialLinks.map(socialLink => (
            <a
              key={socialLink.name}
              href={socialLink.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Visitar WD Travel en ${socialLink.name}`}
              title={socialLink.name}
              style={{ display: 'flex', color: '#fff', width: '32px', height: '32px', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ display: 'flex', width: '22px', height: '22px' }}>{socialLink.icon}</span>
            </a>
          ))}
        </div>
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