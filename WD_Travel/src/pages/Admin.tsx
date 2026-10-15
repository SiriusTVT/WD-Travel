import React, { useState } from 'react';
import { type Booking } from '../data/mockData';
import { LocationSelector } from '../components/LocationSelector';
import { CallingCodeSelector } from '../components/CallingCodeSelector';
import { isValidCallingCode } from '../data/callingCodes';
import { formatDisplayDate } from '../formatDate';
import {
  clampIntegerInput,
  getLocalDateString,
  isValidContactPhone,
  isValidDate,
  isValidDocumentNumber,
  isValidLocation,
  isValidPersonName,
  MAX_BOOKING_AMOUNT,
  MAX_CHILD_AGE,
  MAX_TRAVELERS,
  normalizeDocumentNumber,
  normalizePhoneNumber
} from '../formValidation';

const getNameParts = (firstName = '', lastName = '', fullName = '') => {
  const [legacyFirstName = '', ...legacyLastName] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName || legacyFirstName,
    lastName: lastName || legacyLastName.join(' ')
  };
};

const joinName = (firstName: string, lastName: string) => `${firstName.trim()} ${lastName.trim()}`.trim();
const getPhoneParts = (phone: string) => {
  const match = phone.trim().match(/^(\+\d+)\s*(.*)$/);
  if (match && isValidCallingCode(match[1])) {
    return { phoneCountryCode: match[1], phone: normalizePhoneNumber(match[2]) };
  }
  return { phoneCountryCode: '+57', phone: normalizePhoneNumber(phone) };
};
const formatPhoneForDisplay = (phone: string) =>
  phone.trim()
    ? /^\+\d+/.test(phone.trim()) ? phone.trim() : `+57 ${phone.trim()}`
    : 'No registrado';
const PAYMENT_METHODS = ['TRANSFERENCIA', 'EFECTIVO', 'TARJETA'];

const getBookingRoute = (booking: Pick<Booking, 'route' | 'tripType' | 'returnDate'>) => {
  const routeParts = booking.route.split(' ➔ ').map(stop => stop.trim()).filter(Boolean);
  const origin = routeParts[0] || '';
  const isRoundTrip = (booking.tripType ?? (booking.returnDate ? 'ROUND_TRIP' : 'ONE_WAY')) === 'ROUND_TRIP';
  const lastStop = routeParts[routeParts.length - 1] || '';
  const destination = isRoundTrip && routeParts.length > 2 && lastStop === origin
    ? routeParts[routeParts.length - 2]
    : lastStop;

  return [origin, destination, ...(isRoundTrip ? [origin] : [])];
};

interface AdminProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
}

export const Admin: React.FC<AdminProps> = ({ bookings, setBookings }) => {
  const [activeView, setActiveView] = useState<'quotes' | 'purchases'>('quotes');
  const [search, setSearch] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<Booking | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [completingQuote, setCompletingQuote] = useState(false);
  const [editingQuote, setEditingQuote] = useState(false);
  // Estados de ubicación
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const [newBooking, setNewBooking] = useState({
    quoteDate: new Date().toISOString().split('T')[0],
    purchaseDate: '',
    firstName: '',
    lastName: '',
    phoneCountryCode: '+57',
    phone: '',
    cedula: '',
    documentType: 'Cédula de ciudadanía',
    bookingCode: '',
    travelDate: '',
    returnDate: '',
    tripType: 'ROUND_TRIP' as 'ONE_WAY' | 'ROUND_TRIP',
    adultCount: 1 as number | '',
    childCount: 0 as number | '',
    childAges: [] as (number | '')[],
    isTicket: false,
    isPackage: true,
    airline: '',
    paymentMethod: 'TRANSFERENCIA',
    totalValue: 0 as number | '',
    paymentStatus: 'PENDIENTE',
    paidAmount: 0 as number | ''
  });

  const resetForm = () => {
    setOrigin('');
    setDestination('');
    setNewBooking({
      quoteDate: new Date().toISOString().split('T')[0],
      purchaseDate: '',
      firstName: '',
      lastName: '',
      phoneCountryCode: '+57',
      phone: '',
      cedula: '',
      documentType: 'Cédula de ciudadanía',
      bookingCode: '',
      travelDate: '',
      returnDate: '',
      tripType: 'ROUND_TRIP',
      adultCount: 1,
      childCount: 0,
      childAges: [],
      isTicket: false,
      isPackage: true,
      airline: '',
      paymentMethod: 'TRANSFERENCIA',
      totalValue: 0 as number | '',
      paymentStatus: 'PENDIENTE',
      paidAmount: 0 as number | ''
    });
  };

  const handleEditClick = (booking: Booking) => {
    setCompletingQuote(false);
    setEditingQuote(false);
    const routeParts = getBookingRoute(booking);
    setOrigin(routeParts[0] || '');
    setDestination(routeParts[1] || '');
    const primaryName = getNameParts(
      booking.firstName || booking.passengers?.[0]?.firstName,
      booking.lastName || booking.passengers?.[0]?.lastName,
      booking.passenger || booking.passengers?.[0]?.name
    );
    const phoneParts = getPhoneParts(booking.phone);
    setNewBooking({
      quoteDate: booking.quoteDate || booking.purchaseDate,
      purchaseDate: booking.purchaseDate,
      ...primaryName,
      ...phoneParts,
      cedula: booking.cedula,
      documentType: booking.documentType || 'Cédula de ciudadanía',
      bookingCode: booking.bookingCode,
      travelDate: booking.travelDate,
      returnDate: booking.returnDate,
      tripType: booking.tripType ?? (booking.returnDate ? 'ROUND_TRIP' : 'ONE_WAY'),
      adultCount: booking.adultCount ?? 1,
      childCount: booking.childCount ?? 0,
      childAges: Array.from(
        { length: booking.childCount ?? 0 },
        (_, index) => booking.childAges?.[index] ?? ''
      ),
      isTicket: booking.isTicket,
      isPackage: booking.isPackage,
      airline: booking.airline,
      paymentMethod: booking.paymentMethod,
      totalValue: booking.totalValue,
      paymentStatus: booking.paymentStatus,
      paidAmount: booking.paidAmount
    });
    setEditingBookingId(booking.id);
    setShowAddModal(true);
  };

  const handleEditQuoteClick = (booking: Booking) => {
    handleEditClick(booking);
    setEditingQuote(true);
  };

  const handleDeleteClick = (booking: Booking) => {
    const shouldDelete = window.confirm(`¿Deseas eliminar el registro de ${booking.passenger}?`);
    if (!shouldDelete) return;

    setBookings(currentBookings => currentBookings.filter(currentBooking => currentBooking.id !== booking.id));
    setSelectedPassenger(currentPassenger => currentPassenger?.id === booking.id ? null : currentPassenger);
  };

  const handleCompletePurchaseClick = (booking: Booking) => {
    handleEditClick(booking);
    setNewBooking(current => ({
      ...current,
      bookingCode: booking.bookingCode === 'PENDIENTE' ? '' : booking.bookingCode,
      airline: booking.airline === 'Por definir' ? '' : booking.airline,
      totalValue: booking.totalValue || '',
      paidAmount: booking.paidAmount || 0,
      paymentMethod: PAYMENT_METHODS.includes(booking.paymentMethod) ? booking.paymentMethod : 'TRANSFERENCIA',
      paymentStatus: 'PENDIENTE'
    }));
    setCompletingQuote(true);
  };

  const normalizeTravelerCounts = () => {
    setNewBooking(current => {
      const adultCount = current.adultCount || 1;
      const childCount = current.childCount || 0;
      return {
        ...current,
        adultCount,
        childCount,
        childAges: Array.from(
          { length: Number(childCount) },
          (_, index) => current.childAges[index] ?? ''
        )
      };
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const adultCount = Number(newBooking.adultCount);
    const childCount = Number(newBooking.childCount);
    const hasInvalidPassengerCounts =
      newBooking.adultCount === '' ||
      newBooking.childCount === '' ||
      !Number.isInteger(adultCount) ||
      !Number.isInteger(childCount) ||
      adultCount < 1 ||
      childCount < 0 ||
      adultCount + childCount > MAX_TRAVELERS ||
      newBooking.childAges.length !== childCount ||
      newBooking.childAges.some(age =>
        age === '' || !Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > MAX_CHILD_AGE
      );
    const hasInvalidRoute =
      !isValidLocation(origin) ||
      !isValidLocation(destination) ||
      origin === destination;
    const hasInvalidDates =
      !isValidDate(newBooking.travelDate) ||
      (!editingBookingId && newBooking.travelDate < getLocalDateString()) ||
      (newBooking.tripType === 'ROUND_TRIP' && (
        !isValidDate(newBooking.returnDate) ||
        newBooking.returnDate < newBooking.travelDate
      ));

    if (hasInvalidRoute || hasInvalidDates || hasInvalidPassengerCounts) {
      window.alert('Verifica la ruta, las fechas y la cantidad de viajeros. Cada niño debe tener una edad entre 0 y 17 años.');
      return;
    }

    if (
      !isValidPersonName(newBooking.firstName) ||
      !isValidPersonName(newBooking.lastName) ||
      !isValidDocumentNumber(newBooking.cedula, newBooking.documentType) ||
      !isValidContactPhone(newBooking.phone, newBooking.phoneCountryCode)
    ) {
      window.alert('Verifica nombres, apellidos, documento e indicativo/número telefónico.');
      return;
    }

    const totalValue = Number(newBooking.totalValue);
    const paidAmount = Number(newBooking.paidAmount);
    if (!editingQuote && (
      !Number.isFinite(totalValue) ||
      totalValue < 0 ||
      totalValue > MAX_BOOKING_AMOUNT ||
      !Number.isFinite(paidAmount) ||
      paidAmount < 0 ||
      paidAmount > totalValue ||
      (newBooking.paymentStatus === 'ABONADO' && (paidAmount <= 0 || paidAmount >= totalValue))
    )) {
      window.alert('El valor total debe estar entre $0 y $1.000.000.000. El abono debe ser mayor que cero y menor que el total.');
      return;
    }

    if (completingQuote && (
      !newBooking.bookingCode.trim() ||
      newBooking.bookingCode.trim().length > 30 ||
      !newBooking.airline.trim() ||
      newBooking.airline.trim().length > 80 ||
      totalValue <= 0
    )) {
      window.alert('Completa el código de reserva, la aerolínea y un precio mayor que cero para registrar la compra.');
      return;
    }

    const finalRoute = [origin, destination, ...(newBooking.tripType === 'ROUND_TRIP' ? [origin] : [])].join(' ➔ ');
    const firstName = newBooking.firstName.trim();
    const lastName = newBooking.lastName.trim();
    const passengerName = joinName(firstName, lastName);
    const existingBooking = bookings.find(booking => booking.id === editingBookingId);
    const primaryPassenger = {
      firstName,
      lastName,
      name: passengerName,
      cedula: newBooking.cedula,
      documentType: newBooking.documentType
    };
    const quoteData = {
      firstName,
      lastName,
      passenger: passengerName,
      phone: `${newBooking.phoneCountryCode} ${newBooking.phone.trim()}`,
      cedula: newBooking.cedula,
      documentType: newBooking.documentType,
      route: finalRoute,
      travelDate: newBooking.travelDate,
      returnDate: newBooking.tripType === 'ROUND_TRIP' ? newBooking.returnDate : '',
      tripType: newBooking.tripType,
      adultCount: Number(newBooking.adultCount),
      childCount: Number(newBooking.childCount),
      childAges: newBooking.childAges.map(Number),
      isTicket: newBooking.isTicket,
      isPackage: newBooking.isPackage,
      passengers: editingBookingId && existingBooking?.passengers.length
        ? [primaryPassenger, ...existingBooking.passengers.slice(1)]
        : [primaryPassenger]
    };

    if (editingQuote && editingBookingId) {
      setBookings(currentBookings => currentBookings.map(booking => booking.id === editingBookingId
        ? { ...booking, ...quoteData }
        : booking
      ));
      setShowAddModal(false);
      setEditingBookingId(null);
      setEditingQuote(false);
      resetForm();
      return;
    }

    const purchaseDate = completingQuote
      ? existingBooking?.purchaseDate || new Date().toISOString().split('T')[0]
      : newBooking.paymentStatus === 'PAGADO'
        ? existingBooking?.purchaseDate || newBooking.purchaseDate || new Date().toISOString().split('T')[0]
        : existingBooking?.purchaseDate || '';
    const bookingData = {
      ...newBooking,
      paymentMethod: completingQuote && !PAYMENT_METHODS.includes(newBooking.paymentMethod)
        ? 'TRANSFERENCIA'
        : newBooking.paymentMethod,
      purchaseDate,
      ...quoteData,
      totalValue,
      paymentStatus: newBooking.paymentStatus,
      paidAmount: newBooking.paymentStatus === 'PAGADO' && !completingQuote
        ? totalValue
        : Math.min(Number(newBooking.paidAmount) || 0, totalValue)
    };

    if (editingBookingId) {
      setBookings(currentBookings => currentBookings.map(booking => booking.id === editingBookingId
        ? { id: booking.id, ...bookingData }
        : booking
      ));
    } else {
      const created: Booking = {
        id: Date.now().toString(),
        ...bookingData
      };
      setBookings(currentBookings => [created, ...currentBookings]);
    }

    setShowAddModal(false);
    setEditingBookingId(null);
    setCompletingQuote(false);
    setEditingQuote(false);
    resetForm();
    setActiveView(completingQuote || newBooking.paymentStatus === 'PAGADO' ? 'purchases' : 'quotes');
  };

  const searchedBookings = bookings.filter(b =>
    b.passenger.toLowerCase().includes(search.toLowerCase()) ||
    b.phone.includes(search) ||
    b.cedula.includes(search)
  );
  const pendingQuotes = searchedBookings.filter(booking => !booking.purchaseDate);
  const purchases = searchedBookings.filter(booking => Boolean(booking.purchaseDate));
  const filteredBookings = activeView === 'quotes' ? pendingQuotes : purchases;

  const formatCurrency = (amount: number) => amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
  const formatAmountInput = (amount: number | '') => amount === '' ? '' : amount.toLocaleString('es-CO');
  const parseAmountInput = (value: string): number | '' => {
    const digits = value.replace(/\D/g, '');
    return digits ? Number(digits) : '';
  };
  const formTotalValue = Number(newBooking.totalValue) || 0;
  const formPaidAmount = Number(newBooking.paidAmount) || 0;

  return (
    <div style={{ padding: '30px 40px', maxWidth: '100%', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h2 style={{ color: '#2D60A8', margin: 0, fontSize: '1.8rem' }}>
            📋 Panel de Administración - WD Travel
          </h2>
          <p style={{ color: '#6b7280', margin: '5px 0 0 0' }}>Gestión centralizada de reservas y clientes</p>
        </div>
        <button
          onClick={() => {
            setEditingBookingId(null);
            setEditingQuote(false);
            setCompletingQuote(false);
            resetForm();
            setShowAddModal(true);
          }}
          style={{ padding: '12px 24px', backgroundColor: '#2D60A8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(45,96,168,0.2)' }}
        >
          ➕ Registrar Cliente / Venta (WhatsApp)
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar cliente por Nombre, Cédula o Celular..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '1rem' }}
        />
      </div>

      <div role="tablist" aria-label="Secciones de administración" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #d1d5db' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'quotes'}
          onClick={() => setActiveView('quotes')}
          style={{ padding: '12px 18px', border: 'none', borderBottom: activeView === 'quotes' ? '3px solid #E3B31D' : '3px solid transparent', backgroundColor: 'transparent', color: activeView === 'quotes' ? '#2D60A8' : '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Cotizaciones pendientes ({pendingQuotes.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'purchases'}
          onClick={() => setActiveView('purchases')}
          style={{ padding: '12px 18px', border: 'none', borderBottom: activeView === 'purchases' ? '3px solid #E3B31D' : '3px solid transparent', backgroundColor: 'transparent', color: activeView === 'purchases' ? '#2D60A8' : '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Compras registradas ({purchases.length})
        </button>
      </div>

      {/* Tabla estilo Excel */}
      <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#2D60A8', color: '#fff' }}>
              <th style={{ padding: '14px' }}>{activeView === 'quotes' ? 'FECHA DE COTIZACIÓN' : 'FECHA DE COMPRA'}</th>
              <th style={{ padding: '14px' }}>PASAJERO</th>
              <th style={{ padding: '14px' }}>CELULAR</th>
              <th style={{ padding: '14px' }}>RUTA</th>
              <th style={{ padding: '14px' }}>TIPO DE VIAJE</th>
              <th style={{ padding: '14px' }}>FECHA VIAJE</th>
              <th style={{ padding: '14px' }}>FECHA REGRESO</th>
              <th style={{ padding: '14px' }}>TIPO</th>
              <th style={{ padding: '14px' }}>VIAJEROS</th>
              {activeView === 'purchases' && (
                <>
                  <th style={{ padding: '14px' }}>COD RESERVA</th>
                  <th style={{ padding: '14px' }}>AEROLÍNEA</th>
                  <th style={{ padding: '14px' }}>PAGO</th>
                  <th style={{ padding: '14px' }}>VALOR TOTAL</th>
                  <th style={{ padding: '14px' }}>ABONADO</th>
                  <th style={{ padding: '14px' }}>SALDO PENDIENTE</th>
                  <th style={{ padding: '14px' }}>ESTADO DEL PAGO</th>
                </>
              )}
              <th style={{ padding: '14px' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={activeView === 'quotes' ? 10 : 17} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  {activeView === 'quotes' ? 'No hay cotizaciones pendientes.' : 'Todavía no hay compras registradas.'}
                </td>
              </tr>
            ) : filteredBookings.map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '14px' }}>{formatDisplayDate(activeView === 'quotes' ? (b.quoteDate || b.purchaseDate) : b.purchaseDate)}</td>
                <td style={{ padding: '14px', fontWeight: 'bold', color: '#111827' }}>
                  {b.passenger}
                  <div style={{ marginTop: '4px', fontWeight: 'normal', fontSize: '0.85rem', color: '#4b5563' }}>
                    <div>Tipo de documento: {b.documentType || 'Cédula de ciudadanía'}</div>
                    <div>Cédula: {b.cedula || 'No registrada'}</div>
                  </div>
                  {b.passengers?.length > 1 && (
                    <details style={{ marginTop: '6px', fontWeight: 'normal' }}>
                      <summary style={{ color: '#2D60A8', cursor: 'pointer' }}>Ver {b.passengers.length} pasajeros</summary>
                      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                        {b.passengers.map((passenger, index) => (
                          <div key={`${b.id}-${index}`} style={{ marginBottom: index < b.passengers.length - 1 ? '6px' : 0 }}>
                            <strong>{passenger.name}</strong>
                            <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                              <div>Tipo de documento: {passenger.documentType || 'Cédula de ciudadanía'}</div>
                              <div>Cédula: {passenger.cedula || 'No registrada'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </td>
                <td style={{ padding: '14px' }}>{formatPhoneForDisplay(b.phone)}</td>
                <td style={{ padding: '14px', minWidth: '210px', lineHeight: 1.6 }}>
                  {getBookingRoute(b).map((stop, index, stops) => (
                    <div key={`${b.id}-route-${index}`}>
                      {stop}{index < stops.length - 1 ? ' ➔' : ''}
                    </div>
                  ))}
                </td>
                <td style={{ padding: '14px' }}>{(b.tripType ?? (b.returnDate ? 'ROUND_TRIP' : 'ONE_WAY')) === 'ROUND_TRIP' ? 'IDA Y VUELTA' : 'SOLO IDA'}</td>
                <td style={{ padding: '14px' }}>{formatDisplayDate(b.travelDate)}</td>
                <td style={{ padding: '14px' }}>{b.returnDate ? formatDisplayDate(b.returnDate) : '—'}</td>
                <td style={{ padding: '14px' }}>{b.isPackage ? 'PAQUETE' : 'TIQUETE'}</td>
                <td style={{ padding: '14px' }}>
                  {b.adultCount ?? 'Sin dato'} adulto(s), {b.childCount ?? 'Sin dato'} niño(s)
                  {(b.childAges?.length ?? 0) > 0 && (
                    <div style={{ marginTop: '4px', color: '#4b5563' }}>
                      Edades: {b.childAges?.map(age => `${age} años`).join(', ')}
                    </div>
                  )}
                </td>
                {activeView === 'purchases' && (
                  <>
                    <td style={{ padding: '14px', color: b.bookingCode === 'PENDIENTE' ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{b.bookingCode || 'PENDIENTE'}</td>
                    <td style={{ padding: '14px' }}>{b.airline}</td>
                    <td style={{ padding: '14px' }}>{b.paymentMethod}</td>
                    <td style={{ padding: '14px' }}>{formatCurrency(b.totalValue)}</td>
                    <td style={{ padding: '14px' }}>{formatCurrency(b.paidAmount)}</td>
                    <td style={{ padding: '14px', color: b.totalValue - b.paidAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{formatCurrency(Math.max(0, b.totalValue - b.paidAmount))}</td>
                    <td style={{ padding: '14px', color: b.paymentStatus === 'PAGADO' ? '#16a34a' : b.paymentStatus === 'PENDIENTE' ? '#dc2626' : '#d97706', fontWeight: 'bold' }}>{b.paymentStatus}</td>
                  </>
                )}
                <td style={{ padding: '14px' }}>
                  {activeView === 'quotes' && (
                    <button
                      onClick={() => handleCompletePurchaseClick(b)}
                      style={{ padding: '6px 14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Completar compra
                    </button>
                  )}
                  {activeView === 'purchases' && (
                    <button
                      onClick={() => setSelectedPassenger(b)}
                      style={{ padding: '6px 14px', backgroundColor: '#f3f4f6', color: '#2D60A8', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Ver Perfil
                    </button>
                  )}
                  <button
                    onClick={() => activeView === 'quotes' ? handleEditQuoteClick(b) : handleEditClick(b)}
                    style={{ marginLeft: '8px', padding: '6px 14px', backgroundColor: '#E3B31D', color: '#2D60A8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteClick(b)}
                    style={{ marginLeft: '8px', padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Perfil Detallado */}
      {selectedPassenger && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ color: '#2D60A8', marginTop: 0, borderBottom: '2px solid #E3B31D', paddingBottom: '10px' }}>👤 Perfil del Cliente</h3>
            <p style={{ marginTop: '15px' }}><strong>Nombre:</strong> {selectedPassenger.passenger}</p>
            <p><strong>{selectedPassenger.documentType || 'Número de identidad'}:</strong> {selectedPassenger.cedula || 'No registrado'}</p>
            <p><strong>Tipo de viaje:</strong> {(selectedPassenger.tripType ?? (selectedPassenger.returnDate ? 'ROUND_TRIP' : 'ONE_WAY')) === 'ROUND_TRIP' ? 'Ida y vuelta' : 'Solo ida'}</p>
            <p><strong>Fecha de ida:</strong> {formatDisplayDate(selectedPassenger.travelDate)}</p>
            {selectedPassenger.returnDate && <p><strong>Fecha de regreso:</strong> {formatDisplayDate(selectedPassenger.returnDate)}</p>}
            <p><strong>Viajeros:</strong> {selectedPassenger.adultCount ?? 'Sin dato'} adulto(s), {selectedPassenger.childCount ?? 'Sin dato'} niño(s)</p>
            {(selectedPassenger.childAges?.length ?? 0) > 0 && (
              <p><strong>Edades de los niños:</strong> {selectedPassenger.childAges?.map(age => `${age} años`).join(', ')}</p>
            )}
            {selectedPassenger.passengers?.length > 1 && (
              <div style={{ margin: '15px 0', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <strong>Pasajeros del registro:</strong>
                {selectedPassenger.passengers.map((passenger, index) => (
                  <p key={`${selectedPassenger.id}-profile-${index}`} style={{ margin: '8px 0 0' }}>
                    {passenger.name} - {passenger.documentType || 'Número de identidad'}: {passenger.cedula}
                  </p>
                ))}
              </div>
            )}
            <p><strong>Celular / WhatsApp:</strong> {formatPhoneForDisplay(selectedPassenger.phone)}</p>
            <p><strong>Ruta:</strong> {getBookingRoute(selectedPassenger).join(' ➔ ')}</p>
            <p><strong>Código de Reserva:</strong> {selectedPassenger.bookingCode}</p>
            <p><strong>Aerolínea:</strong> {selectedPassenger.airline}</p>
            <p><strong>Método de Pago:</strong> {selectedPassenger.paymentMethod}</p>
            <p><strong>Valor Total:</strong> {formatCurrency(selectedPassenger.totalValue)}</p>
            <p><strong>Valor Abonado:</strong> {formatCurrency(selectedPassenger.paidAmount)}</p>
            <p><strong>Saldo Pendiente:</strong> {formatCurrency(Math.max(0, selectedPassenger.totalValue - selectedPassenger.paidAmount))}</p>
            <p><strong>Estado del Pago:</strong> {selectedPassenger.paymentStatus}</p>
            <button 
              onClick={() => setSelectedPassenger(null)}
              style={{ marginTop: '20px', width: '100%', padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Registrar o editar venta manual */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', maxWidth: '720px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#2D60A8', marginTop: 0, borderBottom: '2px solid #E3B31D', paddingBottom: '10px' }}>
              {completingQuote ? 'Completar cotización y registrar compra' : editingQuote ? 'Editar datos de la cotización' : editingBookingId ? '✏️ Editar Cliente / Venta' : '➕ Registrar Cliente / Venta Manual'}
            </h3>
            {completingQuote && (
              <p style={{ margin: '12px 0 0', color: '#4b5563' }}>
                Completa los datos de la reserva, la aerolínea y el precio. Al guardar, la cotización pasará a Compras registradas.
              </p>
            )}
            
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Nombres:</label>
                  <input required type="text" minLength={2} maxLength={60} pattern="[\p{L}][\p{L}\s'-]{1,59}" title="Usa entre 2 y 60 letras; se permiten espacios, guiones y apóstrofos." placeholder="Ej: María José" value={newBooking.firstName} onChange={e => setNewBooking({...newBooking, firstName: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Apellidos:</label>
                  <input required type="text" minLength={2} maxLength={60} pattern="[\p{L}][\p{L}\s'-]{1,59}" title="Usa entre 2 y 60 letras; se permiten espacios, guiones y apóstrofos." placeholder="Ej: Pérez Gómez" value={newBooking.lastName} onChange={e => setNewBooking({...newBooking, lastName: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Tipo de documento:</label>
                  <select required value={newBooking.documentType} onChange={e => setNewBooking(current => ({
                    ...current,
                    documentType: e.target.value,
                    cedula: normalizeDocumentNumber(current.cedula, e.target.value)
                  }))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option>Cédula de ciudadanía</option>
                    <option>Tarjeta de identidad</option>
                    <option>Registro civil</option>
                    <option>Cédula de extranjería</option>
                    <option>Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Número de identidad:</label>
                  <input required type="text" inputMode={newBooking.documentType === 'Pasaporte' ? 'text' : 'numeric'} minLength={newBooking.documentType === 'Pasaporte' ? 6 : 5} maxLength={15} pattern={newBooking.documentType === 'Pasaporte' ? '[A-Za-z0-9]{6,15}' : '[0-9]{5,15}'} title={newBooking.documentType === 'Pasaporte' ? 'El pasaporte debe tener entre 6 y 15 letras o números.' : 'El documento debe tener entre 5 y 15 dígitos.'} value={newBooking.cedula} onChange={e => setNewBooking({...newBooking, cedula: normalizeDocumentNumber(e.target.value, newBooking.documentType)})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                <div>
                  <label htmlFor="admin-phone-country-code" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Número indicativo:</label>
                  <CallingCodeSelector
                    id="admin-phone-country-code"
                    value={newBooking.phoneCountryCode}
                    onChange={phoneCountryCode => setNewBooking(current => ({ ...current, phoneCountryCode }))}
                  />
                </div>
                <div>
                  <label htmlFor="admin-phone" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Celular / WhatsApp:</label>
                  <input
                    id="admin-phone"
                    required
                    type="tel"
                    inputMode="numeric"
                    minLength={newBooking.phoneCountryCode === '+57' ? 10 : 7}
                    maxLength={15}
                    pattern={newBooking.phoneCountryCode === '+57' ? '3[0-9]{9}' : '[0-9]{7,15}'}
                    title={newBooking.phoneCountryCode === '+57' ? 'Ingresa un celular colombiano de 10 dígitos que empiece por 3.' : 'Ingresa entre 7 y 15 dígitos.'}
                    value={newBooking.phone}
                    onChange={e => setNewBooking(current => ({ ...current, phone: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong>Cantidad de personas que viajan (adultos y niños)</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label htmlFor="admin-adult-count" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Adultos:</label>
                    <input
                      id="admin-adult-count"
                      required
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{1,2}"
                      title={`Ingresa un número entero entre 1 y ${MAX_TRAVELERS - (Number(newBooking.childCount) || 0)}.`}
                      value={newBooking.adultCount}
                      onBlur={normalizeTravelerCounts}
                      onChange={e => setNewBooking(current => {
                        const maxAdults = MAX_TRAVELERS - (Number(current.childCount) || 0);
                        const adultCount = clampIntegerInput(e.target.value, maxAdults);
                        return { ...current, adultCount: adultCount === '' ? '' : Number(adultCount) };
                      })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="admin-child-count" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Niños:</label>
                    <input
                      id="admin-child-count"
                      required
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{1,2}"
                      title={`Ingresa un número entero entre 0 y ${MAX_TRAVELERS - (Number(newBooking.adultCount) || 1)}.`}
                      value={newBooking.childCount}
                      onBlur={normalizeTravelerCounts}
                      onChange={e => {
                        setNewBooking(current => {
                          const maxChildren = MAX_TRAVELERS - (Number(current.adultCount) || 1);
                          const value = clampIntegerInput(e.target.value, maxChildren);
                          if (value === '') return { ...current, childCount: '', childAges: [] };
                          const childCount = Number(value);
                          return {
                            ...current,
                            childCount,
                            childAges: Array.from(
                              { length: childCount },
                              (_, index) => current.childAges[index] ?? ''
                            )
                          };
                        });
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px' }}
                    />
                  </div>
                  {Number(newBooking.childCount) > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {newBooking.childAges.map((age, index) => (
                        <div key={index}>
                          <label htmlFor={`admin-child-age-${index}`} style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Edad del niño {index + 1}:</label>
                          <input
                            id={`admin-child-age-${index}`}
                            required
                            type="text"
                            inputMode="numeric"
                            maxLength={2}
                            pattern="[0-9]{1,2}"
                            title={`Ingresa una edad entre 0 y ${MAX_CHILD_AGE} años.`}
                            value={age}
                            onChange={e => {
                              const normalizedAge = clampIntegerInput(e.target.value, MAX_CHILD_AGE);
                              const childAge = normalizedAge === '' ? '' : Number(normalizedAge);
                              setNewBooking(current => ({
                                ...current,
                                childAges: current.childAges.map((currentAge, ageIndex) => ageIndex === index ? childAge : currentAge)
                              }));
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Tipo de servicio:</label>
                <select
                  required
                  value={newBooking.isPackage ? 'PAQUETE' : 'TIQUETE'}
                  onChange={e => setNewBooking({ ...newBooking, isPackage: e.target.value === 'PAQUETE', isTicket: e.target.value === 'TIQUETE' })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="TIQUETE">TIQUETE</option>
                  <option value="PAQUETE">PAQUETE</option>
                </select>
              </div>

              {/* Origen */}
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <LocationSelector labelPrefix="Origen" value={origin} onChange={setOrigin} />
              </div>

              {/* Destino */}
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <LocationSelector labelPrefix="Destino" value={destination} onChange={setDestination} />
              </div>

              {!editingQuote && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Código Reserva:</label>
                  <input required={completingQuote} type="text" maxLength={30} placeholder="Ej: 26940704" value={newBooking.bookingCode} onChange={e => setNewBooking({...newBooking, bookingCode: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Aerolínea:</label>
                  <input required={completingQuote} type="text" maxLength={80} placeholder="Ej: Avianca, JetSmart" value={newBooking.airline} onChange={e => setNewBooking({...newBooking, airline: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
              </div>}

              <div>
                <label htmlFor="admin-trip-type" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Tipo de viaje:</label>
                <select
                  id="admin-trip-type"
                  value={newBooking.tripType}
                  onChange={e => {
                    const tripType = e.target.value as 'ONE_WAY' | 'ROUND_TRIP';
                    setNewBooking(current => ({
                      ...current,
                      tripType,
                      returnDate: tripType === 'ONE_WAY' ? '' : current.returnDate
                    }));
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="ROUND_TRIP">Ida y vuelta</option>
                  <option value="ONE_WAY">Solo ida</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: newBooking.tripType === 'ROUND_TRIP' ? '1fr 1fr' : '1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Fecha Viaje:</label>
                  <input required type="date" min={!editingBookingId ? getLocalDateString() : undefined} value={newBooking.travelDate} onChange={e => setNewBooking({...newBooking, travelDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                {newBooking.tripType === 'ROUND_TRIP' && <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Fecha Regreso:</label>
                  <input required type="date" min={newBooking.travelDate || (!editingBookingId ? getLocalDateString() : undefined)} value={newBooking.returnDate} onChange={e => setNewBooking({...newBooking, returnDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>}
              </div>

              {!editingQuote && <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Método de Pago:</label>
                <select value={newBooking.paymentMethod} onChange={e => setNewBooking({...newBooking, paymentMethod: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TARJETA">TARJETA</option>
                </select>
              </div>}

              {!editingQuote && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Valor Total (COP):</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff' }}>
                    <span style={{ paddingLeft: '8px', color: '#374151', fontWeight: 'bold' }}>$</span>
                    <input type="text" inputMode="numeric" maxLength={13} required value={formatAmountInput(newBooking.totalValue)} onChange={e => {
                    const totalValue = parseAmountInput(e.target.value);
                    const numericTotalValue = Number(totalValue) || 0;
                    setNewBooking({ ...newBooking, totalValue, paidAmount: newBooking.paymentStatus === 'PAGADO' ? numericTotalValue : Math.min(Number(newBooking.paidAmount) || 0, numericTotalValue) });
                    }} style={{ width: '100%', padding: '8px', border: 'none', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Estado del Pago:</label>
                  <select required value={newBooking.paymentStatus} onChange={e => {
                    const paymentStatus = e.target.value;
                    setNewBooking({
                      ...newBooking,
                      paymentStatus,
                      paidAmount: paymentStatus === 'PAGADO' ? formTotalValue : paymentStatus === 'PENDIENTE' ? 0 : newBooking.paidAmount
                    });
                  }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="ABONADO">ABONADO</option>
                    {(!editingBookingId || completingQuote || activeView === 'purchases') && <option value="PAGADO">PAGADO</option>}
                  </select>
                </div>
              </div>}

              {!editingQuote && newBooking.paymentStatus === 'ABONADO' && (
                <div style={{ padding: '12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Cantidad Abonada (COP):</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff' }}>
                    <span style={{ paddingLeft: '8px', color: '#374151', fontWeight: 'bold' }}>$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={13}
                      required
                      value={formatAmountInput(newBooking.paidAmount)}
                      onChange={e => {
                        const parsedAmount = parseAmountInput(e.target.value);
                        const paidAmount = parsedAmount === '' ? '' : Math.min(formTotalValue, parsedAmount);
                        setNewBooking({ ...newBooking, paidAmount });
                      }}
                      style={{ width: '100%', padding: '8px', border: 'none', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: 'bold' }}>
                    <span>Abonado: {formatCurrency(formPaidAmount)}</span>
                    <span style={{ color: '#dc2626' }}>Falta: {formatCurrency(Math.max(0, formTotalValue - formPaidAmount))}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#E3B31D', color: '#2D60A8', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {completingQuote ? 'Registrar compra y mover a Compras' : editingBookingId ? 'Guardar Cambios' : 'Guardar Venta'}
                </button>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingBookingId(null); setCompletingQuote(false); setEditingQuote(false); resetForm(); }} style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};