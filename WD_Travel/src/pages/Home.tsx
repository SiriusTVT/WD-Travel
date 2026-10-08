import React, { useEffect, useState, useRef } from 'react';
import { LocationSelector } from '../components/LocationSelector.tsx';
import type { Booking } from '../data/mockData';

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

type BookingType = 'TIQUETE' | 'PAQUETE';

const travelPackages = [
  {
    destination: 'Madrid, España',
    badge: 'Más solicitado',
    title: 'Plan migratorio a Madrid',
    price: '$3.500.000',
    previousPrice: '$4.500.000',
    details: '10 días en Madrid · Salida 8 de mayo',
    description: 'Te asesoramos antes y durante tu viaje con acompañamiento personalizado 24/7.',
    includes: ['Tiquete aéreo', 'Voucher de alojamiento', 'Asistencia médica', 'Formularios migratorios'],
    formDestination: 'España - Madrid (MAD)',
    image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=900&q=85'
  },
  {
    destination: 'Polonia',
    badge: 'Oportunidad laboral',
    title: 'Plan migratorio a Polonia',
    price: '$8.000.000',
    previousPrice: '$10.000.000',
    details: 'Viaje legal con orientación para trabajar',
    description: 'Te ayudamos con documentos, oportunidades laborales y el proceso de viaje.',
    includes: ['Orientación migratoria', 'Tiquete aéreo', 'Gestión documental', 'Acompañamiento personalizado'],
    formDestination: 'Polonia - Varsovia (WAW)',
    image: 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=900&q=85'
  },
  {
    destination: 'España',
    badge: 'Asesoría 24/7',
    title: 'Plan migratorio España',
    price: '$3.500.000',
    previousPrice: '$4.500.000',
    details: 'Planes para estudiar, trabajar o vacacionar',
    description: 'Viaja seguro con lo necesario para ingresar a Europa sin preocupaciones.',
    includes: ['Tiquete aéreo', 'Alojamiento', 'Asistencia médica', 'Soporte antes y durante el viaje'],
    formDestination: 'España - Madrid (MAD)',
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=85'
  }
];

const travelServices = [
  {
    icon: '✈️',
    title: 'Paquetes vacacionales a medida',
    description: 'Diseñamos escapadas nacionales e internacionales con vuelos, hospedajes verificados y actividades exclusivas organizadas para que solo te preocupes por disfrutar.'
  },
  {
    icon: '🛡️',
    title: 'Asistencia al viajero y seguros globales',
    description: 'Cobertura médica internacional, protección de equipaje y soporte ante imprevistos para garantizar tu bienestar y el de tu familia en cualquier rincón del mundo.'
  },
  {
    icon: '🗂️',
    title: 'Asesoría en visados y trámites migratorios',
    description: 'Acompañamiento paso a paso en requisitos de entrada, documentación y gestión consular para que tus planes de viaje o reubicación avancen sin contratiempos.'
  },
  {
    icon: '🚐',
    title: 'Logística y traslados personalizados',
    description: 'Conexiones aéreas estratégicas, traslados privados y reservas coordinadas al milímetro para que tu itinerario fluya sin esperas innecesarias.'
  }
];

interface HomeProps {
  onBookingSubmit: (booking: Booking) => void;
}

export const Home: React.FC<HomeProps> = ({ onBookingSubmit }) => {
  const [submitted, setSubmitted] = useState(false);
  const [isHeroVideoFading, setIsHeroVideoFading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroVideoFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+57');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('TIQUETE');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState('Cédula de ciudadanía');
  const [documentNumber, setDocumentNumber] = useState('');
  const [adultCount, setAdultCount] = useState('1');
  const [childCount, setChildCount] = useState('0');
  const childCountValue = Number(childCount) || 0;
  const [childAges, setChildAges] = useState<string[]>([]);

  const handleTravelerCountChange = (type: 'adults' | 'children', value: string) => {
    if (type === 'adults') setAdultCount(value);
    else {
      setChildCount(value);
      const nextChildCount = Number(value);
      if (Number.isInteger(nextChildCount) && nextChildCount >= 0 && nextChildCount <= 19) {
        setChildAges(currentAges => Array.from(
          { length: nextChildCount },
          (_, index) => currentAges[index] ?? ''
        ));
      }
    }
  };

  const normalizeTravelerCounts = () => {
    const nextAdultCount = adultCount || '1';
    const nextChildCount = childCount || '0';
    setAdultCount(nextAdultCount);
    setChildCount(nextChildCount);
    const normalizedChildCount = Number(nextChildCount);
    if (Number.isInteger(normalizedChildCount) && normalizedChildCount >= 0 && normalizedChildCount <= 19) {
      setChildAges(currentAges => Array.from(
        { length: normalizedChildCount },
        (_, index) => currentAges[index] ?? ''
      ));
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectPackage = (destination: string) => {
    setBookingType('PAQUETE');
    setDestination(destination);
    scrollToForm();
  };

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
    if (existingScript) {
      window.instgrm?.Embeds?.process();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.instagram.com/embed.js';
    script.onload = () => window.instgrm?.Embeds?.process();
    document.body.appendChild(script);
  }, []);

  useEffect(() => () => {
    if (heroVideoFadeTimeoutRef.current) clearTimeout(heroVideoFadeTimeoutRef.current);
  }, []);

  const handleHeroVideoEnd = () => {
    setIsHeroVideoFading(true);
    heroVideoFadeTimeoutRef.current = setTimeout(() => {
      const video = heroVideoRef.current;
      if (video) {
        video.currentTime = 0;
        void video.play();
      }
      setIsHeroVideoFading(false);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedAdultCount = Number(adultCount);
    const normalizedChildCount = Number(childCount);
    if (
      !Number.isInteger(normalizedAdultCount) ||
      !Number.isInteger(normalizedChildCount) ||
      normalizedAdultCount < 1 ||
      normalizedChildCount < 0 ||
      normalizedAdultCount + normalizedChildCount > 20 ||
      childAges.slice(0, normalizedChildCount).some(age => age === '')
    ) {
      window.alert('Verifica la cantidad de adultos y niños, e indica la edad de cada niño.');
      return;
    }
    const passengerName = `${firstName} ${lastName}`.trim();
    const titular = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: passengerName,
      cedula: documentNumber,
      documentType
    };

    onBookingSubmit({
      id: Date.now().toString(),
      quoteDate: new Date().toISOString().split('T')[0],
      purchaseDate: '',
      firstName: titular.firstName,
      lastName: titular.lastName,
      passenger: titular.name,
      phone: `${phoneCountryCode} ${phone.trim()}`,
      cedula: titular.cedula,
      documentType: titular.documentType,
      route: `${origin} ➔ ${destination}`,
      bookingCode: 'PENDIENTE',
      travelDate,
      returnDate,
      adultCount: normalizedAdultCount,
      childCount: normalizedChildCount,
      childAges: childAges.slice(0, normalizedChildCount).map(Number),
      isTicket: bookingType === 'TIQUETE',
      isPackage: bookingType === 'PAQUETE',
      airline: 'Por definir',
      paymentMethod: 'PENDIENTE',
      totalValue: 0,
      paymentStatus: 'PENDIENTE',
      paidAmount: 0,
      passengers: [titular]
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
        <video
          ref={heroVideoRef}
          className={`hero-video${isHeroVideoFading ? ' hero-video-fading' : ''}`}
          autoPlay
          muted
          playsInline
          onEnded={handleHeroVideoEnd}
          aria-hidden="true"
        >
          <source src="/wd-travel-hero.mp4" type="video/mp4" />
        </video>
        <div className="hero-content" style={{ maxWidth: '900px', margin: '0 auto' }}>
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
            Cotizar mi viaje ahora
          </button>
          <button type="button" className="hero-secondary-button" onClick={() => document.querySelector('.packages-section')?.scrollIntoView({ behavior: 'smooth' })}>
            Explorar paquetes y servicios
          </button>
        </div>
        <button
          type="button"
          className="scroll-cue"
          aria-label="Desplazarse para descubrir más"
          onClick={() => document.querySelector('.about-section')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="scroll-arrow" aria-hidden="true">↓</span>
        </button>
      </section>

      <section className="about-section" aria-labelledby="about-title">
        <div className="about-content">
          <span className="section-eyebrow">Nuestra esencia</span>
          <h2 id="about-title">Más que una agencia: tu aliado en cada paso del viaje</h2>
          <p>
            En <strong>W.D Travel</strong> somos tu aliado estratégico en cada paso del camino, con atención digital y un punto físico en el Centro Comercial La Estación, Torre B – Local BP-05. Nacimos para eliminar la incertidumbre y las horas perdidas al planificar un itinerario, transformando el proceso de viaje en una experiencia fluida, transparente y adaptada al presupuesto y estilo de vida de cada viajero.
          </p>
          <p>
            Nuestra misión es conectar a personas y familias con sus destinos ideales brindando respaldo real de principio a fin. Ya sea que busques una escapada vacacional, apoyo en reubicación internacional o la tranquilidad de contar con asistencia integral ante cualquier imprevisto, en <strong>W.D Travel</strong> viajas con la certeza de tener un equipo experto cuidando cada detalle.
          </p>
        </div>
        <div className="about-highlights">
          <strong>Viaja con respaldo real</strong>
          <span>Asesoría personalizada antes, durante y después de tu viaje.</span>
          <strong>Planes claros y a tu medida</strong>
          <span>Opciones pensadas para tus objetivos, presupuesto y estilo de vida.</span>
        </div>
      </section>

      <section className="presentation-section" aria-labelledby="presentation-title">
        <div className="presentation-copy">
          <span className="section-eyebrow">Conoce nuestra comunidad</span>
          <h2 id="presentation-title">Viaja con W.D Travel</h2>
          <p>
            Descubre nuestra presentación y conoce las experiencias, servicios y oportunidades que tenemos para acompañarte en tu próximo destino.
          </p>
          <a
            className="presentation-link"
            href="https://www.instagram.com/reel/DVyuF5YDrwq/?utm_source=ig_embed&utm_campaign=loading"
            target="_blank"
            rel="noreferrer"
          >
            Ver en Instagram
          </a>
        </div>
        <div className="presentation-video">
          <blockquote
            className="instagram-media"
            data-instgrm-captioned
            data-instgrm-permalink="https://www.instagram.com/reel/DVyuF5YDrwq/?utm_source=ig_embed&utm_campaign=loading"
            data-instgrm-version="14"
          >
            <a href="https://www.instagram.com/reel/DVyuF5YDrwq/?utm_source=ig_embed&utm_campaign=loading" target="_blank" rel="noreferrer">
              Ver esta publicación en Instagram
            </a>
          </blockquote>
        </div>
      </section>

      <section className="packages-section" aria-labelledby="packages-title">
        <div className="packages-heading">
          <span className="section-eyebrow">Ofertas WD Travel</span>
          <h2 id="packages-title">Paquetes para hacer realidad tu próximo viaje</h2>
          <p>Elige una opción y recibe asesoría personalizada para reservarla.</p>
        </div>
        <div className="packages-grid">
          {travelPackages.map(travelPackage => (
            <article className="package-card" key={travelPackage.title}>
              <div
                className="package-image"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(13, 42, 82, 0.08), rgba(13, 42, 82, 0.85)), url('${travelPackage.image}')` }}
              >
                <span className="package-badge">{travelPackage.badge}</span>
                <div className="package-destination">{travelPackage.destination}</div>
              </div>
              <div className="package-content">
                <h3>{travelPackage.title}</h3>
                <p className="package-details">{travelPackage.details}</p>
                <div className="package-price">
                  <strong>{travelPackage.price}</strong>
                  <del>{travelPackage.previousPrice}</del>
                </div>
                <p className="package-description">{travelPackage.description}</p>
                <ul className="package-includes">
                  {travelPackage.includes.map(item => <li key={item}>{item}</li>)}
                </ul>
                <button type="button" className="package-button" onClick={() => selectPackage(travelPackage.formDestination)}>
                  Quiero cotizar este paquete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section" aria-labelledby="services-title">
        <div className="packages-heading">
          <span className="section-eyebrow">Viaja con tranquilidad</span>
          <h2 id="services-title">Todo lo que necesitas para disfrutar el camino</h2>
          <p>Coordinamos cada detalle para que tengas una experiencia segura y sin complicaciones.</p>
        </div>
        <div className="services-grid">
          {travelServices.map(service => (
            <article className="service-card" key={service.title}>
              <span className="service-icon" aria-hidden="true">{service.icon}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <div ref={formRef} style={{ padding: '40px 20px 60px 20px' }}>
        <div className="quote-card" style={{ maxWidth: '850px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>

          {!submitted && (
            <div style={{ textAlign: 'center', marginBottom: '35px' }}>
              <h2 style={{ color: '#2D60A8', fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                Completa tu cotización
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
                Cuéntanos los detalles de tu viaje y te enviaremos una opción a tu medida.
              </p>
            </div>
          )}

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
                <h3 style={{ margin: '0 0 15px 0', color: '#2D60A8', fontSize: '1.1rem' }}>Datos del titular</h3>
                <div className="traveler-fields-grid">
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Nombres:</label>
                    <input required type="text" placeholder="Ej.: María José" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Apellidos:</label>
                    <input required type="text" placeholder="Ej.: Pérez Gómez" value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Tipo de documento de identidad:</label>
                    <select required value={documentType} onChange={e => setDocumentType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}>
                      <option>Cédula de ciudadanía</option>
                      <option>Tarjeta de identidad</option>
                      <option>Registro civil</option>
                      <option>Cédula de extranjería</option>
                      <option>Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Número de identidad:</label>
                    <input required type="text" placeholder="Escribe el número de identidad" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                </div>
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
                    <input id="child-count" required type="number" min="0" max={20 - (Number(adultCount) || 1)} value={childCount} onChange={e => handleTravelerCountChange('children', e.target.value)} onBlur={normalizeTravelerCounts} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                </div>
              </div>

              {childCountValue > 0 && (
                <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', marginBottom: '12px', color: '#374151' }}>Edad de los niños:</strong>
                  <div className="travel-count-grid">
                    {childAges.slice(0, childCountValue).map((age, index) => (
                      <div key={index}>
                        <label htmlFor={`child-age-${index}`} style={{ display: 'block', marginBottom: '6px', color: '#4b5563' }}>Edad del niño {index + 1}:</label>
                        <input
                          id={`child-age-${index}`}
                          required
                          type="number"
                          min="0"
                          value={age}
                          onChange={e => setChildAges(currentAges => currentAges.map((currentAge, ageIndex) => ageIndex === index ? e.target.value : currentAge))}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

      <section className="closing-cta" aria-labelledby="closing-cta-title">
        <div>
          <span className="section-eyebrow">Estamos para ayudarte</span>
          <h2 id="closing-cta-title">El viaje de tus sueños comienza con una conversación.</h2>
          <p>Cuéntanos a dónde quieres ir y nosotros nos encargamos del resto. Recibe una cotización personalizada en minutos o síguenos para inspirarte con nuestras ofertas y recomendaciones.</p>
        </div>
        <div className="closing-actions">
          <a className="whatsapp-button" href="https://wa.me/573332688678" target="_blank" rel="noreferrer">
            Hablar con un asesor por WhatsApp
          </a>
          <a className="instagram-button" href="https://www.instagram.com/w.d.travel3/" target="_blank" rel="noreferrer">
            Síguenos en Instagram @w.d.travel3
          </a>
        </div>
      </section>
    </div>
  );
};