import React, { useState, useRef } from 'react';
import { LocationSelector } from '../components/LocationSelector.tsx';
import type { Booking } from '../data/mockData';

interface Traveler {
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
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
  const [phoneCountryCode, setPhoneCountryCode] = useState('+57');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('TIQUETE');
  const [adultCount, setAdultCount] = useState('1');
  const [childCount, setChildCount] = useState('0');
  const adultCountValue = Number(adultCount) || 1;
  const childCountValue = Number(childCount) || 0;
  const [travelers, setTravelers] = useState<Traveler[]>([
    { firstName: '', lastName: '', documentType: 'Cédula de ciudadanía', documentNumber: '' }
  ]);

  const syncTravelersWithCounts = (adultValue: string, childValue: string) => {
    if (adultValue === '' || childValue === '') return;
    const nextAdultCount = Number(adultValue);
    const nextChildCount = Number(childValue);
    if (
      !Number.isInteger(nextAdultCount) ||
      !Number.isInteger(nextChildCount) ||
      nextAdultCount < 1 ||
      nextChildCount < 0 ||
      nextAdultCount + nextChildCount > 20
    ) return;

    setTravelers(currentTravelers => Array.from(
      { length: nextAdultCount + nextChildCount },
      (_, index) => currentTravelers[index] ?? {
        firstName: '',
        lastName: '',
        documentType: 'Cédula de ciudadanía',
        documentNumber: ''
      }
    ));
  };

  const handleTravelerCountChange = (type: 'adults' | 'children', value: string) => {
    const nextAdultCount = type === 'adults' ? value : adultCount;
    const nextChildCount = type === 'children' ? value : childCount;
    if (type === 'adults') setAdultCount(value);
    else setChildCount(value);
    syncTravelersWithCounts(nextAdultCount, nextChildCount);
  };

  const normalizeTravelerCounts = () => {
    const nextAdultCount = adultCount || '1';
    const nextChildCount = childCount || '0';
    setAdultCount(nextAdultCount);
    setChildCount(nextChildCount);
    syncTravelersWithCounts(nextAdultCount, nextChildCount);
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
      firstName: traveler.firstName.trim(),
      lastName: traveler.lastName.trim(),
      name: `${traveler.firstName} ${traveler.lastName}`.trim(),
      cedula: traveler.documentNumber,
      documentType: traveler.documentType
    }));

    onBookingSubmit({
      id: Date.now().toString(),
      purchaseDate: new Date().toISOString().split('T')[0],
      firstName: passengerList[0].firstName,
      lastName: passengerList[0].lastName,
      passenger: passengerList[0].name,
      phone: `${phoneCountryCode} ${phone.trim()}`,
      cedula: passengerList[0].cedula,
      documentType: passengerList[0].documentType,
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

      <section className="hero-section" style={{
        color: '#ffffff',
        padding: '80px 20px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 className="hero-title" style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 15px 0' }}>
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
            Realiza tu solicitud de cotización
          </button>
        </div>
      </section>

      <div ref={formRef} style={{ padding: '40px 20px 60px 20px' }}>
        <div className="quote-card" style={{ maxWidth: '850px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>

          <div style={{ textAlign: 'center', marginBottom: '35px' }}>
            <h2 style={{ color: '#2D60A8', fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>
              Completa tu cotización
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
              Cuéntanos los detalles de tu viaje y te enviaremos una opción a tu medida.
            </p>
          </div>

          {submitted ? (
            <div style={{ padding: '30px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '12px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem' }}>¡Solicitud enviada con éxito!</h3>
              <p style={{ margin: 0 }}>
                Cotización registrada para la ruta: <strong>{origin} ➔ {destination}</strong>. Nos pondremos en contacto lo más pronto posible.
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
                <h3 style={{ margin: '0 0 15px 0', color: '#2D60A8', fontSize: '1.1rem' }}>Datos de las personas que viajan</h3>
                {travelers.map((traveler, index) => (
                  <div key={index} style={{ marginBottom: index < travelers.length - 1 ? '15px' : 0, padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <strong style={{ display: 'block', marginBottom: '10px', color: '#374151' }}>
                      {index < adultCountValue ? `Adulto ${index + 1}` : `Niño ${index - adultCountValue + 1}`}
                    </strong>
                    <div className="traveler-fields-grid">
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Nombres:</label>
                        <input required type="text" placeholder="Ej.: María José" value={traveler.firstName} onChange={e => updateTraveler(index, 'firstName', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Apellidos:</label>
                        <input required type="text" placeholder="Ej.: Pérez Gómez" value={traveler.lastName} onChange={e => updateTraveler(index, 'lastName', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Tipo de documento de identidad:</label>
                        <select required value={traveler.documentType} onChange={e => updateTraveler(index, 'documentType', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}>
                          <option>Cédula de ciudadanía</option>
                          <option>Tarjeta de identidad</option>
                          <option>Registro civil</option>
                          <option>Cédula de extranjería</option>
                          <option>Pasaporte</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Número de identidad:</label>
                        <input required type="text" placeholder="Escribe el número de identidad" value={traveler.documentNumber} onChange={e => updateTraveler(index, 'documentNumber', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Contacto (WhatsApp):</label>
                <div className="contact-grid">
                  <div>
                    <label htmlFor="phone-country-code" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#4b5563' }}>Número indicativo:</label>
                    <select id="phone-country-code" required value={phoneCountryCode} onChange={e => setPhoneCountryCode(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}>
                      <option value="+57">Colombia (+57)</option>
                      <option value="+51">Perú (+51)</option>
                      <option value="+593">Ecuador (+593)</option>
                      <option value="+58">Venezuela (+58)</option>
                      <option value="+1">Estados Unidos (+1)</option>
                      <option value="+34">España (+34)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="whatsapp-number" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#4b5563' }}>Número de WhatsApp:</label>
                    <input id="whatsapp-number" required type="tel" autoComplete="tel-national" placeholder="Ej.: 313 490 2197" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                </div>
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
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Cantidad de personas que viajan (adultos y niños):</label>
                <div className="travel-count-grid">
                  <div>
                    <label htmlFor="adult-count" style={{ display: 'block', marginBottom: '6px', color: '#4b5563' }}>Adultos:</label>
                    <input id="adult-count" required type="number" min="1" max={20 - childCountValue} value={adultCount} onChange={e => handleTravelerCountChange('adults', e.target.value)} onBlur={normalizeTravelerCounts} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label htmlFor="child-count" style={{ display: 'block', marginBottom: '6px', color: '#4b5563' }}>Niños:</label>
                    <input id="child-count" required type="number" min="0" max={20 - adultCountValue} value={childCount} onChange={e => handleTravelerCountChange('children', e.target.value)} onBlur={normalizeTravelerCounts} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                </div>
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