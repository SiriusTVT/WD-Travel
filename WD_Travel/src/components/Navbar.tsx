import React from 'react';
import logo from '../assets/logo.png';

export const socialLinks = [
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
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/people/WDTravel/61574445834395/',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.6 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.4-.1c-2.4 0-4 1.5-4 4.1V10H8v3h2.5v8h3.1Z" fill="currentColor" />
      </svg>
    ),
  },
];

interface NavbarProps {
  currentTab: 'home' | 'admin';
  onGoHome: () => void;
  onAdminLogout?: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onGoHome, onAdminLogout }) => {
  const handleAdminLogout = async () => {
    try {
      await onAdminLogout?.();
    } catch (error) {
      console.error('Error cerrando sesión administrativa:', error);
      window.alert('No fue posible cerrar la sesión. Inténtalo nuevamente.');
    }
  };

  return (
    <nav className={`nav-main ${currentTab === 'home' ? 'nav-home' : 'nav-admin'}`} aria-label="Navegación principal">
      <button
        type="button"
        className="nav-brand"
        onClick={onGoHome}
        aria-label="Volver a la página principal de WD Travel"
      >
        <img src={logo} alt="" />
        <span>W.D <strong>Travel</strong></span>
      </button>

      {currentTab === 'home' ? (
        <>
          <div className="nav-links">
            <a href="#about-section">Nosotros</a>
            <a href="#packages-section">Paquetes</a>
            <a href="#services-section">Servicios</a>
          </div>
          <div className="nav-actions">
            <div className="nav-socials" aria-label="Redes sociales">
              {socialLinks.map(socialLink => (
                <a
                  key={socialLink.name}
                  href={socialLink.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Visitar WD Travel en ${socialLink.name}`}
                  title={socialLink.name}
                >
                  <span>{socialLink.icon}</span>
                </a>
              ))}
            </div>
            <a className="nav-quote-link" href="#quote-form">Cotizar viaje <span aria-hidden="true">↗</span></a>
          </div>
        </>
      ) : (
        <div className="nav-actions">
          <button type="button" className="nav-admin-button" onClick={onGoHome}>Volver al sitio</button>
          <button type="button" className="nav-admin-button nav-admin-logout" onClick={() => void handleAdminLogout()}>Cerrar sesión</button>
        </div>
      )}
    </nav>
  );
};
