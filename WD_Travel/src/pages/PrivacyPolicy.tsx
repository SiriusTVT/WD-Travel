import type { FC } from 'react';
import { Navbar } from '../components/Navbar';

interface PrivacyPolicyProps {
  onBackToSite: () => void;
}

const sectionStyle = { marginTop: '28px' };
const headingStyle = { color: 'var(--wd-navy)', fontSize: '1.15rem', marginBottom: '8px' };

export const PrivacyPolicy: FC<PrivacyPolicyProps> = ({ onBackToSite }) => (
  <div style={{ minHeight: '100vh', background: 'var(--wd-cream)' }}>
    <Navbar currentTab="home" onGoHome={onBackToSite} />
    <main style={{ maxWidth: '820px', margin: '0 auto', padding: '48px 20px 64px', color: 'var(--wd-ink)', lineHeight: 1.7 }}>
      <h1 style={{ color: 'var(--wd-navy)', fontSize: '2rem', marginBottom: '6px' }}>Política de tratamiento de datos personales</h1>
      <p style={{ color: 'var(--wd-muted)' }}>Conforme a la Ley 1581 de 2012 y sus decretos reglamentarios.</p>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>1. Responsable del tratamiento</h2>
        <p>W.D Travel S.A.S., NIT 901801265-0, con dirección comercial en CC La Estación, Carrera 1 No. 36-38, local BP 05, Cali, Valle del Cauca. Contacto: WhatsApp +57 333 268 8678.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>2. Datos que recolectamos</h2>
        <p>Cuando solicitas una cotización recolectamos nombre, apellidos, tipo y número de documento (incluida la cédula), teléfono, ruta, fechas de viaje, número de viajeros y los datos de los pasajeros que nos indiques.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>3. Finalidad</h2>
        <p>Usamos tus datos para preparar y gestionar tu cotización, contactarte, emitir los tiquetes y servicios que solicites y cumplir las obligaciones legales de la agencia de viajes. No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>4. Autorización</h2>
        <p>Al enviar el formulario de cotización aceptas expresamente este tratamiento. La autorización queda registrada con la fecha y hora de la solicitud.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>5. Seguridad</h2>
        <p>Los números de documento se almacenan cifrados. El acceso al sistema administrativo está restringido a personal autorizado, con contraseña y doble factor de autenticación.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>6. Tus derechos</h2>
        <p>Como titular puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar la autorización cuando no exista un deber legal o contractual de conservarlos. Puedes ejercer estos derechos escribiéndonos por WhatsApp al +57 333 268 8678.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>7. Conservación</h2>
        <p>Conservamos los datos mientras sean necesarios para la finalidad descrita y para cumplir las obligaciones legales aplicables.</p>
      </section>

      <p style={{ marginTop: '36px', color: 'var(--wd-muted)', fontSize: '0.88rem' }}>Última actualización: noviembre de 2026.</p>
    </main>
  </div>
);
