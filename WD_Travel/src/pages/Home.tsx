import React, { useEffect, useState, useRef } from 'react';
import { LocationSelector } from '../components/LocationSelector.tsx';
import { CallingCodeSelector } from '../components/CallingCodeSelector.tsx';
import type { Booking } from '../data/mockData';
import {
  getLocalDateString,
  clampIntegerInput,
  isValidContactPhone,
  isValidDate,
  isValidDocumentNumber,
  isValidLocation,
  isValidPersonName,
  MAX_CHILD_AGE,
  MAX_TRAVELERS,
  normalizeDocumentNumber
} from '../formValidation';

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
    title: 'Paquetes vacacionales a medida',
    description: 'Diseñamos escapadas nacionales e internacionales con vuelos, hospedajes verificados y actividades exclusivas organizadas para que solo te preocupes por disfrutar.'
  },
  {
    title: 'Asistencia al viajero y seguros globales',
    description: 'Cobertura médica internacional, protección de equipaje y soporte ante imprevistos para garantizar tu bienestar y el de tu familia en cualquier rincón del mundo.'
  },
  {
    title: 'Asesoría en visados y trámites migratorios',
    description: 'Acompañamiento paso a paso en requisitos de entrada, documentación y gestión consular para que tus planes de viaje o reubicación avancen sin contratiempos.'
  },
  {
    title: 'Logística y traslados personalizados',
    description: 'Conexiones aéreas estratégicas, traslados privados y reservas coordinadas al milímetro para que tu itinerario fluya sin esperas innecesarias.'
  }
];

const SectionDivider = ({ fill = 'var(--wd-sky)' }: { fill?: string }) => (
  <section className="section-divider" aria-hidden="true">
    <svg viewBox="0 0 1200 40" preserveAspectRatio="none">
      <path d="M0,18 C260,-12 740,48 1200,18 V40 H0 Z" style={{ fill }} />
    </svg>
  </section>
);

interface HomeProps {
  onBookingSubmit: (booking: Booking) => void;
}

export const Home: React.FC<HomeProps> = ({ onBookingSubmit }) => {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationSent, setNotificationSent] = useState<boolean | null>(null);
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
  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP'>('ROUND_TRIP');
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
    if (type === 'adults') {
      const nextAdultCount = clampIntegerInput(value, MAX_TRAVELERS - childCountValue);
      setAdultCount(nextAdultCount);
    } else {
      const nextChildCount = clampIntegerInput(value, MAX_TRAVELERS - (Number(adultCount) || 1));
      setChildCount(nextChildCount);
      if (nextChildCount !== '') {
        setChildAges(currentAges => Array.from(
          { length: Number(nextChildCount) },
          (_, index) => currentAges[index] ?? ''
        ));
      } else {
        setChildAges([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedAdultCount = Number(adultCount);
    const normalizedChildCount = Number(childCount);
    if (
      !isValidPersonName(firstName) ||
      !isValidPersonName(lastName) ||
      !isValidDocumentNumber(documentNumber, documentType) ||
      !isValidContactPhone(phone, phoneCountryCode) ||
      !isValidLocation(origin) ||
      !isValidLocation(destination) ||
      origin === destination ||
      !isValidDate(travelDate) ||
      travelDate < getLocalDateString() ||
      (tripType === 'ROUND_TRIP' && (
        !isValidDate(returnDate) ||
        returnDate < travelDate
      ))
    ) {
      window.alert('Revisa nombres, documento, teléfono, ruta y fechas. Verifica que los datos tengan el formato indicado.');
      return;
    }
    if (
      !Number.isInteger(normalizedAdultCount) ||
      !Number.isInteger(normalizedChildCount) ||
      normalizedAdultCount < 1 ||
      normalizedChildCount < 0 ||
      normalizedAdultCount + normalizedChildCount > MAX_TRAVELERS ||
      childAges.slice(0, normalizedChildCount).some(age =>
        age === '' || !Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > MAX_CHILD_AGE
      )
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

    const booking: Booking = {
      id: Date.now().toString(),
      quoteDate: new Date().toISOString().split('T')[0],
      purchaseDate: '',
      firstName: titular.firstName,
      lastName: titular.lastName,
      passenger: titular.name,
      phone: `${phoneCountryCode} ${phone.trim()}`,
      cedula: titular.cedula,
      documentType: titular.documentType,
      route: `${origin} ➔ ${destination}${tripType === 'ROUND_TRIP' ? ` ➔ ${origin}` : ''}`,
      bookingCode: 'PENDIENTE',
      travelDate,
      returnDate: tripType === 'ROUND_TRIP' ? returnDate : '',
      tripType,
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
    };

    setIsSubmitting(true);
    setNotificationSent(null);
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      });

      if (!response.ok) {
        throw new Error('No fue posible guardar la cotización.');
      }

      const result: { notificationSent?: boolean } = await response.json();
      setNotificationSent(result.notificationSent === true);
      onBookingSubmit(booking);
      setSubmitted(true);
    } catch (error) {
      console.error('Error enviando la cotización:', error);
      window.alert('No fue posible guardar tu cotización. Revisa tu conexión e inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
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
          <button
            onClick={scrollToForm}
            className="hero-cta"
            style={{
              padding: '16px 36px',
              background: 'linear-gradient(135deg, var(--wd-blue), var(--wd-navy))',
              color: '#fff',
              border: 'none',
              borderRadius: '50px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(16, 47, 89, 0.25)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
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
      <SectionDivider fill="var(--wd-sky)" />

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
      <SectionDivider fill="var(--wd-cream)" />

      <section className="presentation-section" aria-labelledby="presentation-title">
        <div className="presentation-copy">
          <span className="section-eyebrow">Conoce nuestra comunidad</span>
          <h2 id="presentation-title">Viaja con W.D Travel</h2>
          <p>
            Descubre nuestra presentación y conoce las experiencias, servicios y oportunidades que tenemos para acompañarte en tu próximo destino.
          </p>
          <div className="community-links" aria-label="Enlaces de nuestra comunidad">
            <a href="https://www.instagram.com/w.d.travel3/" target="_blank" rel="noreferrer" aria-label="Visitar WD Travel en Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
              Instagram
            </a>
            <a href="https://www.tiktok.com/@wdtravel6?_r=1&_t=ZS-94le7Y8Db3i" target="_blank" rel="noreferrer" aria-label="Visitar WD Travel en TikTok">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 4v10.2a4.8 4.8 0 1 1-4.1-4.75v2.7a2.1 2.1 0 1 0 1.4 1.98V4H15Z" fill="currentColor" />
                <path d="M15 4c.3 1.7 1.25 2.72 3 3.05v2.45c-1.1-.08-2.1-.42-3-1.02V4Z" fill="currentColor" opacity=".65" />
              </svg>
              TikTok
            </a>
            <a href="https://www.facebook.com/people/WDTravel/61574445834395/" target="_blank" rel="noreferrer" aria-label="Visitar WD Travel en Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.6 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.4-.1c-2.4 0-4 1.5-4 4.1V10H8v3h2.5v8h3.1Z" fill="currentColor" />
              </svg>
              Facebook
            </a>
          </div>
        </div>
        <div className="presentation-video">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink="https://www.instagram.com/reel/De0YNANsTy3/?utm_source=ig_embed&utm_campaign=loading"
            data-instgrm-version="14"
            style={{
              background: '#FFF',
              border: 0,
              borderRadius: '3px',
              boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
              margin: '1px',
              maxWidth: '540px',
              minWidth: '326px',
              padding: 0,
              width: '99.375%',
            }}
            dangerouslySetInnerHTML={{
              __html: `<div style="padding:16px;"> <a href="https://www.instagram.com/reel/De0YNANsTy3/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">Ver esta publicación en Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/reel/De0YNANsTy3/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">Una publicación compartida por W.D.Travel (@w.d.travel3)</a></p></div>`
            }}
          />
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
      <SectionDivider fill="var(--wd-gold)" />

      <section className="services-section" aria-labelledby="services-title">
        <div className="packages-heading">
          <span className="section-eyebrow">Viaja con tranquilidad</span>
          <h2 id="services-title">Todo lo que necesitas para disfrutar el camino</h2>
          <p>Coordinamos cada detalle para que tengas una experiencia segura y sin complicaciones.</p>
        </div>
        <div className="services-grid">
          {travelServices.map(service => (
            <article className="service-card" key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>
      <SectionDivider fill="var(--wd-sky)" />

      <div ref={formRef} style={{ padding: '40px 20px 60px 20px' }}>
        <div className="quote-card" style={{ maxWidth: '850px', margin: '0 auto', borderRadius: '18px' }}>

          {!submitted && (
            <div style={{ textAlign: 'center', marginBottom: '35px' }}>
              <h2 style={{ color: 'var(--wd-blue)', fontSize: '1.8rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                Completa tu cotización
              </h2>
              <p style={{ color: 'var(--wd-muted)', fontSize: '1rem', margin: 0 }}>
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
              {notificationSent === false && (
                <p role="status" style={{ margin: '12px 0 0', color: '#92400e' }}>
                  La cotización quedó registrada, pero no se pudo enviar el aviso por correo al equipo. No es necesario volver a enviarla.
                </p>
              )}
              <button
                onClick={() => setSubmitted(false)}
                style={{ marginTop: '20px', padding: '10px 24px', background: 'linear-gradient(135deg, var(--wd-blue), var(--wd-navy))', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'filter 0.2s ease' }}
              >
                Realizar otra consulta
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div style={{ padding: '15px', backgroundColor: 'var(--wd-sky)', borderRadius: '10px', border: '1px solid var(--wd-line)' }}>
                <h3 style={{ margin: '0 0 15px 0', color: 'var(--wd-blue)', fontSize: '1.1rem' }}>Datos del titular</h3>
                <div className="traveler-fields-grid">
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Nombres:</label>
                    <input required type="text" minLength={2} maxLength={60} pattern="[\p{L}][\p{L}\s'-]{1,59}" title="Usa entre 2 y 60 letras; se permiten espacios, guiones y apóstrofos." placeholder="Ej.: María José" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Apellidos:</label>
                    <input required type="text" minLength={2} maxLength={60} pattern="[\p{L}][\p{L}\s'-]{1,59}" title="Usa entre 2 y 60 letras; se permiten espacios, guiones y apóstrofos." placeholder="Ej.: Pérez Gómez" value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Tipo de documento de identidad:</label>
                    <select required value={documentType} onChange={e => {
                      setDocumentType(e.target.value);
                      setDocumentNumber(current => normalizeDocumentNumber(current, e.target.value));
                    }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--wd-line)', backgroundColor: 'var(--wd-cream)' }}>
                      <option>Cédula de ciudadanía</option>
                      <option>Tarjeta de identidad</option>
                      <option>Registro civil</option>
                      <option>Cédula de extranjería</option>
                      <option>Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Número de identidad:</label>
                    <input required type="text" inputMode={documentType === 'Pasaporte' ? 'text' : 'numeric'} minLength={documentType === 'Pasaporte' ? 6 : 5} maxLength={15} pattern={documentType === 'Pasaporte' ? '[A-Za-z0-9]{6,15}' : '[0-9]{5,15}'} title={documentType === 'Pasaporte' ? 'El pasaporte debe tener entre 6 y 15 letras o números.' : 'El documento debe tener entre 5 y 15 dígitos.'} placeholder="Escribe el número de identidad" value={documentNumber} onChange={e => setDocumentNumber(normalizeDocumentNumber(e.target.value, documentType))} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Contacto (WhatsApp):</label>
                <div className="contact-grid">
                  <div>
                    <label htmlFor="phone-country-code" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--wd-muted)' }}>Número indicativo:</label>
                    <CallingCodeSelector id="phone-country-code" value={phoneCountryCode} onChange={setPhoneCountryCode} />
                  </div>
                  <div>
                    <label htmlFor="whatsapp-number" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--wd-muted)' }}>Número de WhatsApp:</label>
                    <input id="whatsapp-number" required type="tel" inputMode="numeric" autoComplete="tel-national" minLength={phoneCountryCode === '+57' ? 10 : 7} maxLength={15} pattern={phoneCountryCode === '+57' ? '3[0-9]{9}' : '[0-9]{7,15}'} title={phoneCountryCode === '+57' ? 'Ingresa un celular colombiano de 10 dígitos que empiece por 3.' : 'Ingresa entre 7 y 15 dígitos.'} placeholder="Ej.: 3134902197" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                </div>
              </div>

              {/* Selector de Origen */}
              <div style={{ padding: '15px', backgroundColor: 'var(--wd-sky)', borderRadius: '10px', border: '1px solid var(--wd-line)' }}>
                <LocationSelector labelPrefix="Origen" value={origin} onChange={setOrigin} />
              </div>

              {/* Selector de Destino */}
              <div style={{ padding: '15px', backgroundColor: 'var(--wd-sky)', borderRadius: '10px', border: '1px solid var(--wd-line)' }}>
                <LocationSelector labelPrefix="Destino" value={destination} onChange={setDestination} />
              </div>

              <div>
                <label htmlFor="trip-type" style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Tipo de viaje:</label>
                <select
                  id="trip-type"
                  value={tripType}
                  onChange={e => {
                    const nextTripType = e.target.value as 'ONE_WAY' | 'ROUND_TRIP';
                    setTripType(nextTripType);
                    if (nextTripType === 'ONE_WAY') setReturnDate('');
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--wd-line)' }}
                >
                  <option value="ROUND_TRIP">Ida y vuelta</option>
                  <option value="ONE_WAY">Solo ida</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: tripType === 'ROUND_TRIP' ? '1fr 1fr' : '1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Fecha de Ida:</label>
                  <input required type="date" min={getLocalDateString()} value={travelDate} onChange={e => setTravelDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                </div>
                {tripType === 'ROUND_TRIP' && <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Fecha de Regreso:</label>
                  <input required type="date" min={travelDate || getLocalDateString()} value={returnDate} onChange={e => setReturnDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                </div>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Cantidad de personas que viajan (adultos y niños):</label>
                <div className="travel-count-grid">
                  <div>
                    <label htmlFor="adult-count" style={{ display: 'block', marginBottom: '6px', color: 'var(--wd-muted)' }}>Adultos:</label>
                    <input id="adult-count" required type="text" inputMode="numeric" minLength={1} pattern="[0-9]{1,2}" title={`Ingresa un número entero entre 1 y ${MAX_TRAVELERS - childCountValue}.`} value={adultCount} onChange={e => handleTravelerCountChange('adults', e.target.value)} onBlur={normalizeTravelerCounts} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label htmlFor="child-count" style={{ display: 'block', marginBottom: '6px', color: 'var(--wd-muted)' }}>Niños:</label>
                    <input id="child-count" required type="text" inputMode="numeric" minLength={1} pattern="[0-9]{1,2}" title={`Ingresa un número entero entre 0 y ${MAX_TRAVELERS - (Number(adultCount) || 1)}.`} value={childCount} onChange={e => handleTravelerCountChange('children', e.target.value)} onBlur={normalizeTravelerCounts} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                </div>
              </div>

              {childCountValue > 0 && (
                <div style={{ padding: '15px', backgroundColor: 'var(--wd-sky)', borderRadius: '10px', border: '1px solid var(--wd-line)' }}>
                  <strong style={{ display: 'block', marginBottom: '12px', color: 'var(--wd-ink)' }}>Edad de los niños:</strong>
                  <div className="travel-count-grid">
                    {childAges.slice(0, childCountValue).map((age, index) => (
                      <div key={index}>
                        <label htmlFor={`child-age-${index}`} style={{ display: 'block', marginBottom: '6px', color: 'var(--wd-muted)' }}>Edad del niño {index + 1}:</label>
                        <input
                          id={`child-age-${index}`}
                          required
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          pattern="[0-9]{1,2}"
                          title={`Ingresa una edad entre 0 y ${MAX_CHILD_AGE} años.`}
                          value={age}
                          onChange={e => setChildAges(currentAges => currentAges.map((currentAge, ageIndex) => ageIndex === index ? clampIntegerInput(e.target.value, MAX_CHILD_AGE) : currentAge))}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Tipo de servicio:</label>
                <select required value={bookingType} onChange={e => setBookingType(e.target.value as BookingType)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--wd-line)' }}>
                  <option value="TIQUETE">TIQUETE</option>
                  <option value="PAQUETE">PAQUETE</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-submit"
                style={{ marginTop: '10px', width: '100%', padding: '15px', background: 'linear-gradient(135deg, var(--wd-gold-dark), var(--wd-gold))', color: 'var(--wd-navy)', border: 'none', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(244, 189, 36, 0.35)', transition: 'transform 0.2s ease, filter 0.2s ease' }}
              >
                {isSubmitting ? 'Guardando cotización...' : 'Enviar Solicitud de Cotización'}
              </button>
            </form>
          )}
        </div>
      </div>
      <SectionDivider fill="var(--wd-gold)" />

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
          <a className="social-button instagram-button" href="https://www.instagram.com/w.d.travel3/" target="_blank" rel="noreferrer">
            Síguenos en Instagram @w.d.travel3
          </a>
          <a className="social-button tiktok-button" href="https://www.tiktok.com/@wdtravel6?_r=1&_t=ZS-94le7Y8Db3i" target="_blank" rel="noreferrer">
            Síguenos en TikTok @wdtravel6
          </a>
          <a className="social-button facebook-button" href="https://www.facebook.com/people/WDTravel/61574445834395/" target="_blank" rel="noreferrer">
            Síguenos en Facebook WD Travel
          </a>
        </div>
      </section>
    </div>
  );
};