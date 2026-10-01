import React, { useState, useRef } from 'react';
import { LocationSelector } from '../components/LocationSelector.tsx';
import type { Booking } from '../data/mockData';

interface Traveler {
  firstName: string;
  lastName: string;
  cedula: string;
}

type BookingType = 'TIQUETE' | 'PAQUETE';

interface HomeProps {
  onBookingSubmit: (booking: Booking) => void;
}

export const Home: React.FC<HomeProps> = ({ onBookingSubmit }) => {
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [phone, setPhone] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('TIQUETE');
  const [travelerCount, setTravelerCount] = useState(1);
  const [travelers, setTravelers] = useState<Traveler[]>([
    { firstName: '', lastName: '', cedula: '' }
  ]);

  const handleTravelerCountChange = (value: number) => {
    const count = Math.min(20, Math.max(1, value));
    setTravelerCount(count);
    setTravelers(currentTravelers => Array.from(
      { length: count },
      (_, index) => currentTravelers[index] ?? { firstName: '', lastName: '', cedula: '' }
    ));
  };

  const updateTraveler = (index: number, field: keyof Traveler, value: string) => {
    setTravelers(currentTravelers => currentTravelers.map((traveler, travelerIndex) =>
      travelerIndex === index ? { ...traveler, [field]: value } : traveler
    ));
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const passengerList = travelers.map(traveler => ({
      name: `${traveler.firstName} ${traveler.lastName}`.trim(),
      cedula: traveler.cedula
    }));

    onBookingSubmit({
      id: Date.now().toString(),
      purchaseDate: new Date().toISOString().split('T')[0],
      passenger: passengerList[0].name,
      phone,
      cedula: passengerList[0].cedula,
      route: `${origin} ➔ ${destination}`,
      bookingCode: 'PENDIENTE',
      travelDate,
      returnDate,
      isTicket: bookingType === 'TIQUETE',
      isPackage: bookingType === 'PAQUETE',
      airline: 'Por definir',
      paymentMethod: 'PENDIENTE',
      totalValue: 0,
      paymentStatus: 'PENDIENTE',
      paidAmount: 0,
      passengers: passengerList
    });
    setSubmitted(true);
  };

  return (
    <div style={{ backgroundColor: '#f4f7fe', minHeight: '100vh' }}>

      {/* 🌟 SECCIÓN 1: PORTADA (HERO) */}
      <section style={{
        background: 'linear-gradient(135deg, #2D60A8 0%, #1a3d6d 100%)',
        color: '#ffffff',
        padding: '80px 20px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '15px' }}>✈️🌴</span>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 15px 0' }}>
            ¡Bienvenido a WD Travel!
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#e0e7ff', maxWidth: '700px', margin: '0 auto 35px auto' }}>
            Tu agencia de confianza para planear tus próximas vacaciones, tiquetes aéreos y paquetes nacionales e internacionales.
          </p>

          <button
            onClick={scrollToForm}
            style={{
              padding: '16px 36px',
              backgroundColor: '#E3B31D',
              color: '#2D60A8',
              border: 'none',
              borderRadius: '50px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(227,179,29,0.4)'
            }}
          >
            🔥 Cotizar Viaje Ahora
          </button>
        </div>
      </section>

      {/* 📝 SECCIÓN 2: FORMULARIO DE COTIZACIÓN CON FILTRO POR PAÍS Y CIUDAD */}
      <div ref={formRef} style={{ padding: '40px 20px 60px 20px' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto', padding: '35px', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>

          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <h2 style={{ color: '#2D60A8', fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>
              Solicita tu Cotización Personalizada
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
              Ingresa tus datos y los detalles de tu viaje para enviarte la mejor tarifa.
            </p>
          </div>

          {submitted ? (
            <div style={{ padding: '30px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '12px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem' }}>¡Solicitud Enviada con Éxito! 🎉</h3>
              <p style={{ margin: 0 }}>
                Cotización registrada para la ruta: <strong>{origin} ➔ {destination}</strong>. Nos pondremos en contacto contigo a la brevedad.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                style={{ marginTop: '20px', padding: '10px 24px', backgroundColor: '#2D60A8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Realizar otra consulta
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#2D60A8', fontSize: '1.1rem' }}>Datos de los viajeros</h3>
                {travelers.map((traveler, index) => (
                  <div key={index} style={{ marginBottom: index < travelers.length - 1 ? '15px' : 0, padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <strong style={{ display: 'block', marginBottom: '10px', color: '#374151' }}>Viajero {index + 1}</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Nombre:</label>
                        <input required type="text" placeholder="Ej: Nelly" value={traveler.firstName} onChange={e => updateTraveler(index, 'firstName', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Apellido:</label>
                        <input required type="text" placeholder="Ej: Amaya" value={traveler.lastName} onChange={e => updateTraveler(index, 'lastName', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Cédula:</label>
                        <input required type="text" placeholder="Ej: 1098765432" value={traveler.cedula} onChange={e => updateTraveler(index, 'cedula', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Número de Teléfono (WhatsApp):</label>
                <input required type="tel" placeholder="Ej: 3134902197" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
              </div>

              {/* Selector de Origen */}
              <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <LocationSelector labelPrefix="Origen" value={origin} onChange={setOrigin} />
              </div>

              {/* Selector de Destino */}
              <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <LocationSelector labelPrefix="Destino" value={destination} onChange={setDestination} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Fecha de Ida:</label>
                  <input required type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Fecha de Regreso:</label>
                  <input required type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>¿Cuántas personas van a viajar?:</label>
                <input required type="number" min="1" max="20" value={travelerCount} onChange={e => handleTravelerCountChange(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Tipo de servicio:</label>
                <select required value={bookingType} onChange={e => setBookingType(e.target.value as BookingType)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                  <option value="TIQUETE">TIQUETE</option>
                  <option value="PAQUETE">PAQUETE</option>
                </select>
              </div>

              <button
                type="submit"
                style={{ marginTop: '10px', width: '100%', padding: '15px', backgroundColor: '#E3B31D', color: '#2D60A8', border: 'none', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(227,179,29,0.35)' }}
              >
                Enviar Solicitud de Cotización
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};