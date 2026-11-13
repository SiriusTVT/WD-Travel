import React, { useEffect, useState, useRef } from 'react';
import { LocationSelector } from '../components/LocationSelector.tsx';
import { ReturnRouteSelector } from '../components/ReturnRouteSelector';
import { socialLinks } from '../components/Navbar';
import logo from '../assets/logo.png';
import { CallingCodeSelector } from '../components/CallingCodeSelector.tsx';
import { SERVICE_TYPE_LABELS, type Booking, type ServiceType } from '../data/mockData';
import { formatBookingRoute } from '../bookingRoutes';
import { type PackageType } from '../data/packageTypes';
import { getAvailablePackageCategories, type PackageCategory, type TravelPackage } from '../data/packageCatalog';
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

type BookingType = ServiceType;

const HERO_ROTATION_MS = 2 * 60 * 1000;

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
  const reels = [
    { url: 'https://www.instagram.com/reel/De0YNANsTy3/' },
    { url: 'https://www.instagram.com/reel/DflZ6ASJc6R/' }
  ];
  const [activeReel, setActiveReel] = useState<number | null>(null);

  const [today, setToday] = useState(getLocalDateString());
  const packageCategories = getAvailablePackageCategories(today);
  const heroPackages = packageCategories
    .filter(category => category.id !== 'asistencias-viaje')
    .flatMap(category =>
    category.packages.map(travelPackage => ({
      category: category.title,
      name: travelPackage.title,
      destination: travelPackage.destination,
      image: travelPackage.image,
      price: travelPackage.price,
      imageCredit: travelPackage.imageCredit
    }))
  );
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  // Campo trampa: los humanos no lo ven; los bots suelen llenarlo.
  const [website, setWebsite] = useState('');
  const [notificationSent, setNotificationSent] = useState<boolean | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  // Cada carga de la página empieza con un destino distinto al azar.
  const [heroDestinationIndex, setHeroDestinationIndex] = useState(() =>
    Math.floor(Math.random() * heroPackages.length)
  );

  useEffect(() => {
    const rotationId = setInterval(() => {
      setHeroDestinationIndex(index => (index + 1) % heroPackages.length);
    }, HERO_ROTATION_MS);
    return () => clearInterval(rotationId);
  }, [heroPackages.length]);

  const heroDestination = heroPackages[heroDestinationIndex % heroPackages.length];

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+57');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP'>('ROUND_TRIP');
  const [hasDifferentReturnRoute, setHasDifferentReturnRoute] = useState(false);
  const [returnOrigin, setReturnOrigin] = useState('');
  const [returnDestination, setReturnDestination] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('TIQUETE');
  const isHotelOnly = bookingType === 'HOTEL';
  const needsReturnDate = isHotelOnly || tripType === 'ROUND_TRIP';
  const requestedRoute = isHotelOnly
    ? destination
    : formatBookingRoute({
      origin,
      destination,
      tripType,
      hasDifferentReturnRoute,
      returnOrigin,
      returnDestination
    });
  const [packageType, setPackageType] = useState<PackageType | ''>('');
  const [packageName, setPackageName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState('Cédula de ciudadanía');
  const [documentNumber, setDocumentNumber] = useState('');
  const [adultCount, setAdultCount] = useState('1');
  const [childCount, setChildCount] = useState('0');
  const childCountValue = Number(childCount) || 0;
  const [childAges, setChildAges] = useState<string[]>([]);

  useEffect(() => {
    const refreshAvailability = () => {
      const currentDate = getLocalDateString();
      setToday(currentDate);
      if (!packageName) return;
      const packageIsAvailable = getAvailablePackageCategories(currentDate).some(category =>
        category.id === packageType && category.packages.some(travelPackage => travelPackage.title === packageName)
      );
      if (!packageIsAvailable) {
        setPackageType('');
        setPackageName('');
        setDestination('');
      }
    };

    const dateRefreshId = window.setInterval(refreshAvailability, 60_000);
    return () => window.clearInterval(dateRefreshId);
  }, [packageName, packageType]);

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

  const selectPackage = (category: PackageCategory, travelPackage: TravelPackage) => {
    setBookingType('PAQUETES');
    setPackageType(category.id);
    setPackageName(travelPackage.title);
    setDestination(travelPackage.formDestination ?? '');
    scrollToForm();
  };

  const handlePackageSelectionChange = (selection: string) => {
    if (selection === 'unspecified') {
      setPackageType('');
      setPackageName('');
      setDestination('');
      return;
    }

    const separatorIndex = selection.indexOf('::');
    if (separatorIndex < 0) {
      setPackageType('');
      setPackageName('');
      setDestination('');
      return;
    }

    const nextType = selection.slice(0, separatorIndex) as PackageType;
    const nextName = selection.slice(separatorIndex + 2);
    const selectedPackage = packageCategories
      .find(category => category.id === nextType)
      ?.packages.find(travelPackage => travelPackage.title === nextName);
    setPackageType(nextType);
    setPackageName(nextName);
    setDestination(selectedPackage?.formDestination ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingType === 'PAQUETES' && packageName && !packageCategories.some(category =>
      category.id === packageType && category.packages.some(travelPackage => travelPackage.title === packageName)
    )) {
      setPackageType('');
      setPackageName('');
      setDestination('');
      window.alert('El paquete seleccionado ya no está disponible. Selecciona una opción vigente para continuar.');
      return;
    }

    const normalizedAdultCount = Number(adultCount);
    const normalizedChildCount = Number(childCount);
    if (
      !isValidPersonName(firstName) ||
      !isValidPersonName(lastName) ||
      !isValidDocumentNumber(documentNumber, documentType) ||
      !isValidContactPhone(phone, phoneCountryCode) ||
      !isValidLocation(destination) ||
      (!isHotelOnly && (!isValidLocation(origin) || origin === destination)) ||
      (!isHotelOnly && tripType === 'ROUND_TRIP' && hasDifferentReturnRoute && (
        !isValidLocation(returnOrigin) ||
        !isValidLocation(returnDestination) ||
        returnOrigin === returnDestination
      )) ||
      !isValidDate(travelDate) ||
      travelDate < getLocalDateString() ||
      (needsReturnDate && (
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
      id: crypto.randomUUID(),
      quoteDate: getLocalDateString(),
      purchaseDate: '',
      firstName: titular.firstName,
      lastName: titular.lastName,
      passenger: titular.name,
      phone: `${phoneCountryCode} ${phone.trim()}`,
      cedula: titular.cedula,
      documentType: titular.documentType,
      route: requestedRoute,
      bookingCode: 'PENDIENTE',
      travelDate,
      returnDate: needsReturnDate ? returnDate : '',
      tripType,
      hasDifferentReturnRoute: !isHotelOnly && tripType === 'ROUND_TRIP' && hasDifferentReturnRoute,
      returnOrigin: !isHotelOnly && tripType === 'ROUND_TRIP'
        ? hasDifferentReturnRoute ? returnOrigin : destination
        : '',
      returnDestination: !isHotelOnly && tripType === 'ROUND_TRIP'
        ? hasDifferentReturnRoute ? returnDestination : origin
        : '',
      adultCount: normalizedAdultCount,
      childCount: normalizedChildCount,
      childAges: childAges.slice(0, normalizedChildCount).map(Number),
      serviceType: bookingType,
      isTicket: bookingType === 'TIQUETE' || bookingType === 'TIQUETE_HOTEL',
      isPackage: bookingType === 'PAQUETES',
      packageType: bookingType === 'PAQUETES' ? packageType || undefined : undefined,
      packageName: bookingType === 'PAQUETES' ? packageName || undefined : undefined,
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
        body: JSON.stringify({ ...booking, privacyAccepted, website })
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
      <section className="hero-section" aria-labelledby="hero-title">
        {heroDestination && (
          <div
            key={heroDestination.name}
            className="hero-destination-cover"
            style={{ backgroundImage: `url('${heroDestination.image}')` }}
            aria-hidden="true"
          />
        )}
        {heroDestination && (
          <div className="hero-destination-label" aria-live="polite">
            <span className="hero-destination-category">{heroDestination.category}</span>
            <span className="hero-destination-place">{heroDestination.destination}</span>
            <strong>{heroDestination.name}</strong>
            {heroDestination.price && <span className="hero-destination-price">{heroDestination.price}</span>}
            {heroDestination.imageCredit && (
              <a className="hero-image-credit" href={heroDestination.imageCredit.url} target="_blank" rel="noreferrer">
                Foto: {heroDestination.imageCredit.label}
              </a>
            )}
          </div>
        )}
        <div className="hero-content">
          <span className="hero-eyebrow">W.D Travel · Agencia de viajes</span>
          <h1 id="hero-title" className="hero-title">El mundo es grande. <em>Tu viaje,</em> a tu medida.</h1>
          <p className="hero-description">Vacaciones, un nuevo comienzo en Europa o una escapada cerca de casa: te acompañamos en cada paso, antes, durante y después.</p>
          <div className="hero-actions">
            <button type="button" onClick={scrollToForm} className="hero-cta">Cotiza tu viaje <span aria-hidden="true">→</span></button>
            <button type="button" className="hero-secondary-button" onClick={() => document.querySelector('.packages-section')?.scrollIntoView({ behavior: 'smooth' })}>Explorar paquetes</button>
          </div>
          <div className="hero-trust-line"><span>✦</span> Asesoría personalizada <span>·</span> Respaldo real en cada etapa</div>
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

      <section className="about-section" id="about-section" aria-labelledby="about-title">
        <div className="about-content">
          <span className="section-eyebrow">Nuestra esencia</span>
          <h2 id="about-title">Más que una agencia: tu aliado en cada paso del viaje</h2>
          <p>
            En <strong>W.D Travel</strong> somos tu aliado estratégico en cada paso del camino, con atención digital y un punto físico en el Centro Comercial La Estación, Torre B – Local BP-05. Nacimos para eliminar la incertidumbre y las horas perdidas al planificar un itinerario, transformando el proceso de viaje en una experiencia fluida, transparente y adaptada al presupuesto y estilo de vida de cada viajero.
          </p>
          <p>
            Nuestra misión es conectar a personas y familias con sus destinos ideales brindando respaldo real de principio a fin. Ya sea que busques una escapada vacacional, apoyo en reubicación internacional o la tranquilidad de contar con asistencia integral ante cualquier imprevisto, en <strong>W.D Travel</strong> viajas con la certeza de tener un equipo experto cuidando cada detalle.
          </p>
          <a className="rnt-badge" href="/documents/certificado-rnt.pdf" target="_blank" rel="noreferrer">
            <strong>Agencia de viajes registrada en el RNT</strong>
            <span>Vigente hasta 31/03/2027 · Ver certificado</span>
          </a>
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
        <div className="presentation-reels" aria-label="Videos de W.D Travel">
          {activeReel === null ? (
            <div className="presentation-card-deck" role="group" aria-label="Elige un video de presentación">
              {reels.map((reel, index) => (
                <button
                  key={reel.url}
                  type="button"
                  className={`presentation-choice-card presentation-choice-card--${index + 1}`}
                  onClick={() => setActiveReel(index)}
                  aria-label={`Ver video de presentación ${index + 1}`}
                >
                  <span className="presentation-choice-card__top">WD TRAVEL <span>0{index + 1}</span></span>
                  <span className="presentation-choice-card__play" aria-hidden="true">▶</span>
                  <span className="presentation-choice-card__bottom">
                    <strong>{index === 0 ? 'Conócenos' : 'Nuestra experiencia'}</strong>
                    <small>Seleccionar video</small>
                  </span>
                </button>
              ))}
              <span className="presentation-card-deck__hint">Escoge una carta para ver el video</span>
            </div>
          ) : (
            <div className="presentation-player">
              <div className="presentation-player__toolbar">
                <button type="button" className="presentation-player__back" onClick={() => setActiveReel(null)}>
                  ← Elegir otro video
                </button>
                <span>Video {activeReel + 1} de {reels.length}</span>
              </div>
              <div className="presentation-video">
                <iframe
                  key={reels[activeReel].url}
                  className="presentation-reel-iframe"
                  src={`${reels[activeReel].url}embed/`}
                  title={`Video ${activeReel + 1} de W.D Travel en Instagram`}
                  loading="lazy"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <a className="presentation-player__external" href={reels[activeReel].url} target="_blank" rel="noopener noreferrer">
                Ver video en Instagram ↗
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="packages-section" id="packages-section" aria-labelledby="packages-title">
        <div className="packages-heading">
          <span className="section-eyebrow">Ofertas WD Travel</span>
          <h2 id="packages-title">Encuentra el paquete ideal para ti</h2>
          <p>Explora nuestras opciones por categoría y recibe asesoría personalizada.</p>
        </div>
        <nav className="package-category-nav" aria-label="Categorías de paquetes">
          {packageCategories.map(category => (
            <a key={category.id} href={`#${category.id}`}>{category.title}</a>
          ))}
        </nav>
        <div className="package-categories">
          {packageCategories.map(category => (
            <section
              className="package-category"
              id={category.id}
              key={category.id}
              aria-labelledby={`${category.id}-title`}
            >
              <div className="package-category-heading">
                <h3 id={`${category.id}-title`}>{category.title}</h3>
                <p>{category.description}</p>
              </div>
              <div className="packages-grid">
                {category.packages.map(travelPackage => (
                  <article className="package-card" key={travelPackage.title}>
                    <div
                      className="package-image"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(13, 42, 82, 0.08), rgba(13, 42, 82, 0.72)), url('${travelPackage.image}')`,
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover'
                      }}
                    >
                      <span className="package-badge">{travelPackage.badge}</span>
                      <div className="package-destination">{travelPackage.destination}</div>
                      {travelPackage.imageCredit && (
                        <a
                          className="package-image-credit"
                          href={travelPackage.imageCredit.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={event => event.stopPropagation()}
                        >
                          Foto: {travelPackage.imageCredit.label}
                        </a>
                      )}
                    </div>
                    <div className="package-content">
                      <h4>{travelPackage.title}</h4>
                      <p className="package-details">{travelPackage.details}</p>
                      {travelPackage.price && (
                        <div className="package-price">
                          <span>{travelPackage.priceLabel}</span>
                          <strong>{travelPackage.price}</strong>
                        </div>
                      )}
                      <p className="package-description">{travelPackage.description}</p>
                      <ul className="package-includes">
                        {travelPackage.includes.map(item => <li key={item}>{item}</li>)}
                      </ul>
                      <button type="button" className="package-button" onClick={() => selectPackage(category, travelPackage)}>
                        {travelPackage.actionText ?? 'Quiero cotizar este paquete'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      <SectionDivider fill="var(--wd-gold)" />

      <section className="services-section" id="services-section" aria-labelledby="services-title">
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

      <div ref={formRef} id="quote-form" className="quote-section" style={{ padding: '40px 20px 60px 20px' }}>
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
                Cotización de <strong>{SERVICE_TYPE_LABELS[bookingType]}</strong> registrada para: <strong>{requestedRoute}</strong>. Nos pondremos en contacto lo más pronto posible.
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
                    <input required type="text" minLength={2} maxLength={60} pattern="[\p{L}][\p{L}\s'\-]{1,59}" title="Usa entre 2 y 60 letras; se permiten espacios, guiones y apóstrofos." placeholder="Ej.: María José" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Apellidos:</label>
                    <input required type="text" minLength={2} maxLength={60} pattern="[\p{L}][\p{L}\s'\-]{1,59}" title="Usa entre 2 y 60 letras; se permiten espacios, guiones y apóstrofos." placeholder="Ej.: Pérez Gómez" value={lastName} onChange={e => setLastName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
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

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Tipo de servicio:</label>
                <select required value={bookingType} onChange={e => {
                  const nextBookingType = e.target.value as BookingType;
                  setBookingType(nextBookingType);
                  if (nextBookingType === 'HOTEL') setHasDifferentReturnRoute(false);
                  if (nextBookingType !== 'PAQUETES') {
                    setPackageType('');
                    setPackageName('');
                    setDestination('');
                  }
                  if (nextBookingType === 'HOTEL') {
                    setOrigin('');
                    setTripType('ROUND_TRIP');
                  }
                }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--wd-line)' }}>
                  <option value="TIQUETE">Tiquete</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="TIQUETE_HOTEL">Tiquete y Hotel</option>
                  <option value="PAQUETES">Paquetes</option>
                </select>
              </div>

              {bookingType === 'PAQUETES' && (
                <div>
                  <label htmlFor="package-name" style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Paquete de interés:</label>
                  <select
                    id="package-name"
                    required
                    value={packageType && packageName ? `${packageType}::${packageName}` : ''}
                    onChange={e => handlePackageSelectionChange(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--wd-line)' }}
                  >
                    <option value="">Selecciona un paquete</option>
                    {packageCategories.map(category => (
                      <optgroup key={category.id} label={category.title}>
                        {category.packages.map(travelPackage => (
                          <option key={`${category.id}-${travelPackage.title}`} value={`${category.id}::${travelPackage.title}`}>
                            {travelPackage.destination} — {travelPackage.title}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              {!isHotelOnly && (
                <div style={{ padding: '15px', backgroundColor: 'var(--wd-sky)', borderRadius: '10px', border: '1px solid var(--wd-line)' }}>
                  <LocationSelector labelPrefix="Origen" value={origin} onChange={setOrigin} />
                </div>
              )}

              {/* Selector de Destino */}
              <div style={{ padding: '15px', backgroundColor: 'var(--wd-sky)', borderRadius: '10px', border: '1px solid var(--wd-line)' }}>
                <LocationSelector labelPrefix="Destino" value={destination} onChange={setDestination} />
              </div>

              {!isHotelOnly && <div>
                <label htmlFor="trip-type" style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>Tipo de viaje:</label>
                <select
                  id="trip-type"
                  value={tripType}
                  onChange={e => {
                    const nextTripType = e.target.value as 'ONE_WAY' | 'ROUND_TRIP';
                    setTripType(nextTripType);
                    if (nextTripType === 'ONE_WAY') {
                      setReturnDate('');
                      setHasDifferentReturnRoute(false);
                    }
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--wd-line)' }}
                >
                  <option value="ROUND_TRIP">Ida y vuelta</option>
                  <option value="ONE_WAY">Solo ida</option>
                </select>
              </div>}

              {!isHotelOnly && tripType === 'ROUND_TRIP' && (
                <ReturnRouteSelector
                  enabled={hasDifferentReturnRoute}
                  returnOrigin={returnOrigin}
                  returnDestination={returnDestination}
                  onEnabledChange={enabled => {
                    setHasDifferentReturnRoute(enabled);
                    if (enabled) {
                      setReturnOrigin(current => current || destination);
                      setReturnDestination(current => current || origin);
                    }
                  }}
                  onReturnOriginChange={setReturnOrigin}
                  onReturnDestinationChange={setReturnDestination}
                />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: needsReturnDate ? '1fr 1fr' : '1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>{isHotelOnly ? 'Fecha de ingreso:' : 'Fecha de Ida:'}</label>
                  <input required type="date" min={getLocalDateString()} value={travelDate} onChange={e => {
                    const nextTravelDate = e.target.value;
                    setTravelDate(nextTravelDate);
                    // Si el regreso quedó antes de la nueva fecha de ida, se ajusta al mismo día.
                    if (returnDate && nextTravelDate && returnDate < nextTravelDate) setReturnDate(nextTravelDate);
                  }} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
                </div>
                {needsReturnDate && <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--wd-ink)' }}>{isHotelOnly ? 'Fecha de salida:' : 'Fecha de Regreso:'}</label>
                  <input required type="date" min={travelDate || getLocalDateString()} value={returnDate} onChange={e => {
                    // No se permite una fecha de regreso anterior a la de ida, aunque se escriba a mano.
                    const nextReturnDate = e.target.value;
                    setReturnDate(travelDate && nextReturnDate && nextReturnDate < travelDate ? travelDate : nextReturnDate);
                  }} style={{ width: '100%', padding: '10px', borderRadius: '8px' }} />
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

              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                <label>
                  Sitio web
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} />
                </label>
              </div>

              <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: 'var(--wd-ink)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  required
                  checked={privacyAccepted}
                  onChange={event => setPrivacyAccepted(event.target.checked)}
                  style={{ marginTop: '4px' }}
                />
                <span>
                  Autorizo a W.D Travel S.A.S. a tratar mis datos personales, incluida mi cédula, para gestionar esta cotización, según la{' '}
                  <a href="/politica-de-privacidad" target="_blank" rel="noreferrer" style={{ color: 'var(--wd-blue)', fontWeight: 700 }}>política de privacidad</a>.
                </span>
              </label>

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
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <div className="site-footer-logo">
              <img src={logo} alt="" />
              <span>W.D <strong>Travel</strong></span>
            </div>
            <p>Viajes y asesoría migratoria, con respaldo real en cada paso del viaje.</p>
            <a className="site-footer-whatsapp" href="https://wa.me/573332688678" target="_blank" rel="noreferrer">
              Escríbenos por WhatsApp
            </a>
            <a className="site-footer-certificate" href="/documents/certificado-rnt.pdf" target="_blank" rel="noreferrer">
              Certificado RNT · vigente hasta 31/03/2027
            </a>
          </div>

          <nav className="site-footer-column" aria-label="Secciones de la página">
            <h3>Secciones</h3>
            <a href="#about-section">Nosotros</a>
            <a href="#packages-section">Paquetes</a>
            <a href="#services-section">Servicios</a>
            <a href="#quote-form">Cotizar viaje</a>
          </nav>

          <div className="site-footer-column">
            <h3>Redes</h3>
            {socialLinks.map(socialLink => (
              <a
                key={socialLink.name}
                href={socialLink.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Visitar WD Travel en ${socialLink.name}`}
              >
                <span className="site-footer-icon">{socialLink.icon}</span>
                {socialLink.name}
              </a>
            ))}
          </div>
        </div>
        <p className="site-footer-copy">
          © {new Date().getFullYear()} W.D Travel. Todos los derechos reservados. ·{' '}
          <a href="/politica-de-privacidad" style={{ color: 'inherit' }}>Política de privacidad</a>
        </p>
      </footer>
    </div>
  );
};