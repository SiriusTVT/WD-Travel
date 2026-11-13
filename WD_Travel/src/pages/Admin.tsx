import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SERVICE_TYPE_LABELS, type Booking, type PaymentRecord, type ServiceType } from '../data/mockData';
import { LocationSelector } from '../components/LocationSelector';
import { ReturnRouteSelector } from '../components/ReturnRouteSelector';
import { CallingCodeSelector } from '../components/CallingCodeSelector';
import { isValidCallingCode } from '../data/callingCodes';
import { getPackageTypeLabel, type PackageType } from '../data/packageTypes';
import { getAvailablePackageCategories } from '../data/packageCatalog';
import { formatBookingRoute } from '../bookingRoutes';
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

const CLIENT_SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  website: 'Página web',
  referral: 'Referido',
  other: 'Otro'
};
const getClientSourceLabel = (source?: string) =>
  source ? (CLIENT_SOURCE_LABELS[source] || 'Sin identificar') : 'Sin registrar';

const getNameParts = (firstName = '', lastName = '', fullName = '') => {
  const [legacyFirstName = '', ...legacyLastName] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName || legacyFirstName,
    lastName: lastName || legacyLastName.join(' ')
  };
};

const getServiceType = (booking: Booking): ServiceType => booking.serviceType ?? (
  booking.isPackage || booking.packageType || booking.packageName
    ? 'PAQUETES'
    : booking.isTicket
      ? 'TIQUETE'
      : 'HOTEL'
);

type ClientHistoryRecord = Booking & { recordType: 'quote' | 'purchase' };

const normalizeClientIdentifier = (cedula: string) => cedula.replace(/[^a-z\d]/gi, '').toUpperCase();

const groupBookingsByClient = (records: Booking[]) => {
  const grouped = new Map<string, Booking[]>();
  records.forEach(booking => {
    const normalizedCedula = normalizeClientIdentifier(booking.cedula || '');
    const key = normalizedCedula ? `cedula:${normalizedCedula}` : `record:${booking.id}`;
    const clientBookings = grouped.get(key);
    if (clientBookings) {
      clientBookings.push(booking);
    } else {
      grouped.set(key, [booking]);
    }
  });
  return [...grouped.entries()].map(([key, clientBookings]) => ({
    key,
    bookings: clientBookings
  }));
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
const getPaymentHistory = (booking: Booking): PaymentRecord[] => booking.paymentHistory?.length
  ? booking.paymentHistory
  : Number(booking.paidAmount) > 0
    ? [{
      amount: Number(booking.paidAmount),
      date: '',
      method: `${booking.paymentMethod || 'Método no registrado'} (acumulado anterior sin detalle)`
    }]
    : [];
const getPaymentDueState = (dueDate: string, today: string) => {
  if (!dueDate) return 'Sin fecha límite';
  const daysUntilDue = Math.ceil(
    (new Date(`${dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000
  );
  if (daysUntilDue < 0) return 'Vencido';
  if (daysUntilDue <= 7) return 'Próximo';
  return 'Pendiente';
};

const getBookingRoute = (booking: Booking) => {
  const outboundRoute = booking.route.split(' / ')[0];
  const routeParts = outboundRoute.split(' ➔ ').map(stop => stop.trim()).filter(Boolean);
  if (getServiceType(booking) === 'HOTEL') return routeParts[0] || '';
  const origin = routeParts[0] || '';
  const isRoundTrip = (booking.tripType ?? (booking.returnDate ? 'ROUND_TRIP' : 'ONE_WAY')) === 'ROUND_TRIP';
  if (isRoundTrip && booking.hasDifferentReturnRoute && booking.returnOrigin && booking.returnDestination) {
    return `${origin} ➔ ${routeParts[1] || ''} / ${booking.returnOrigin} ➔ ${booking.returnDestination}`;
  }
  const lastStop = routeParts[routeParts.length - 1] || '';
  const destination = isRoundTrip && routeParts.length > 2 && lastStop === origin
    ? routeParts[routeParts.length - 2]
    : lastStop;

  return [origin, destination, ...(isRoundTrip ? [origin] : [])].join(' ➔ ');
};

interface AdminProps {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  role: 'admin' | 'advisor';
}

export const Admin: React.FC<AdminProps> = ({ bookings, setBookings, role }) => {
  const [activeView, setActiveView] = useState<'quotes' | 'sentQuotes' | 'purchases' | 'sales' | 'deposits' | 'system'>('quotes');
  const [systemStatus, setSystemStatus] = useState<{
    status: string;
    checkedAt: string;
    uptimeSeconds: number;
    memoryMb: { rss: number; heapUsed: number };
    requestsSinceStart: number;
    serverErrorsSinceStart: number;
    recentErrors: { at: string; status: number; durationMs: number }[];
    checks: { name: string; status: string; latencyMs: number }[];
  } | null>(null);
  const [systemError, setSystemError] = useState('');
  const [systemLoading, setSystemLoading] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState<'all' | 'month' | 'year'>('all');
  const [selectedSalesMonth, setSelectedSalesMonth] = useState(() => getLocalDateString().slice(0, 7));
  const [selectedSalesYear, setSelectedSalesYear] = useState(() => getLocalDateString().slice(0, 4));
  const [search, setSearch] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<Booking | null>(null);
  const [clientHistory, setClientHistory] = useState<ClientHistoryRecord[]>([]);
  const [expandedClientKey, setExpandedClientKey] = useState<string | null>(null);
  const [expandedClientHistory, setExpandedClientHistory] = useState<ClientHistoryRecord[]>([]);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [isLoadingExpandedHistory, setIsLoadingExpandedHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [addingPayment, setAddingPayment] = useState(false);
  const [manualRecordType, setManualRecordType] = useState<'QUOTE' | 'PURCHASE'>('QUOTE');
  const [lockedCedula, setLockedCedula] = useState('');
  const [completingQuote, setCompletingQuote] = useState(false);
  const [editingQuote, setEditingQuote] = useState(false);
  // Estados de ubicación
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [returnOrigin, setReturnOrigin] = useState('');
  const [returnDestination, setReturnDestination] = useState('');
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lockRenewalRef = useRef<number | null>(null);
  const selectedPassengerCedula = selectedPassenger?.cedula;
  const selectedPassengerId = selectedPassenger?.id;

  const acquireClientLock = async (cedula: string, recordId = '') => {
    try {
      const response = await fetch('/api/client-locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, recordId })
      });
      const result: { error?: string; lockedBy?: string } = await response.json();
      if (!response.ok) {
        const message = response.status === 409
          ? `Este cliente está siendo editado por ${result.lockedBy || 'otro asesor'}.`
          : result.error || 'No fue posible bloquear la edición del cliente.';
        window.alert(message);
        return false;
      }
      setLockedCedula(cedula);
      return true;
    } catch (error) {
      console.error('Error bloqueando la edición del cliente:', error);
      window.alert('No fue posible confirmar el bloqueo del cliente. Verifica tu conexión e inténtalo nuevamente.');
      return false;
    }
  };

  const releaseClientLock = async (cedula = lockedCedula) => {
    if (!cedula) return;
    try {
      const response = await fetch(`/api/client-locks/${encodeURIComponent(cedula)}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('El servidor no pudo liberar el bloqueo del cliente.');
      }
      setLockedCedula(currentCedula => currentCedula === cedula ? '' : currentCedula);
    } catch (error) {
      console.error('Error liberando el bloqueo del cliente:', error);
    }
  };

  const handleClientDocumentBlur = async () => {
    const cedula = newBooking.cedula;
    if (!cedula || cedula === lockedCedula) return;
    const previousCedula = lockedCedula;
    if (await acquireClientLock(cedula, editingBookingId || '')) {
      if (previousCedula && previousCedula !== cedula) {
        await releaseClientLock(previousCedula);
      }
    }
  };

  const closeEditingModal = async () => {
    await releaseClientLock();
    setShowAddModal(false);
    setEditingBookingId(null);
    setAddingPayment(false);
    setManualRecordType('QUOTE');
    setCompletingQuote(false);
    setEditingQuote(false);
    resetForm();
  };

  const fetchClientHistory = useCallback(async (cedula: string) => {
    const normalizedCedula = normalizeClientIdentifier(cedula);
    const response = await fetch(`/api/client-history/${encodeURIComponent(normalizedCedula)}`);
    const result: ClientHistoryRecord[] | { error?: string } = await response.json();
    if (!response.ok || !Array.isArray(result)) {
      throw new Error(!Array.isArray(result) && result.error ? result.error : 'No fue posible consultar el historial del cliente.');
    }
    return result;
  }, []);

  const toggleClientHistory = async (clientKey: string, booking: Booking, groupBookings: Booking[]) => {
    if (expandedClientKey === clientKey) {
      setExpandedClientKey(null);
      setExpandedClientHistory([]);
      return;
    }

    setExpandedClientKey(clientKey);
    setExpandedClientHistory([]);
    if (!normalizeClientIdentifier(booking.cedula || '')) {
      setExpandedClientHistory(groupBookings.map(record => ({
        ...record,
        recordType: record.purchaseDate ? 'purchase' : 'quote'
      })));
      return;
    }

    setIsLoadingExpandedHistory(true);
    try {
      setExpandedClientHistory(await fetchClientHistory(booking.cedula));
    } catch (error) {
      console.error('Error consultando los viajes agrupados del cliente:', error);
      setExpandedClientKey(null);
      window.alert(error instanceof Error ? error.message : 'No fue posible consultar los viajes del cliente.');
    } finally {
      setIsLoadingExpandedHistory(false);
    }
  };

  const fetchPurchases = useCallback(async () => {
    if (role !== 'admin') return;

    try {
      const response = await fetch('/api/sales');
      if (!response.ok) throw new Error('El servidor no pudo consultar las compras registradas.');
      const salesData: Booking[] = await response.json();
      setBookings(currentBookings => {
        const nonPurchases = currentBookings.filter(
          b => !salesData.some(s => s.id === b.id)
        );
        return [...salesData, ...nonPurchases];
      });
    } catch (error) {
      console.error('Error al consultar compras registradas:', error);
    } finally {
      setIsLoadingPurchases(false);
    }
  }, [role, setBookings]);

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await fetch('/api/quotes');
      if (!response.ok) throw new Error('El servidor no pudo consultar las cotizaciones pendientes.');
      const quotesData: Booking[] = await response.json();
      setBookings(currentBookings => {
        const nonQuotes = currentBookings.filter(
          b => !quotesData.some(q => q.id === b.id) && Boolean(b.purchaseDate)
        );
        return [...quotesData, ...nonQuotes];
      });
    } catch (error) {
      console.error('Error al consultar cotizaciones pendientes:', error);
    }
  }, [setBookings]);

  const handleQuoteStatusChange = async (booking: Booking, quoteStatus: 'PENDING' | 'SENT') => {
    if (!await acquireClientLock(booking.cedula, booking.id)) return;

    try {
      const response = await fetch(`/api/quotes/${booking.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: booking.cedula, quoteStatus })
      });
      const result: { error?: string; advisorEmail?: string; sentAt?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No fue posible actualizar el estado de la cotización.');
      }

      const updatedQuote: Booking = {
        ...booking,
        quoteStatus,
        ...(quoteStatus === 'SENT'
          ? {
            sentAt: result.sentAt || getLocalDateString(),
            advisorEmail: result.advisorEmail || booking.advisorEmail
          }
          : {})
      };
      setBookings(currentBookings => currentBookings.map(current =>
        current.id === booking.id ? updatedQuote : current
      ));
      setExpandedClientHistory(currentHistory => currentHistory.map(record =>
        record.id === booking.id ? { ...record, ...updatedQuote } : record
      ));
      setClientHistory(currentHistory => currentHistory.map(record =>
        record.id === booking.id ? { ...record, ...updatedQuote } : record
      ));
      void fetchQuotes();
    } catch (error) {
      console.error('Error actualizando el estado de la cotización:', error);
      window.alert(error instanceof Error ? error.message : 'No fue posible actualizar el estado de la cotización.');
    } finally {
      await releaseClientLock(booking.cedula);
    }
  };

  useEffect(() => {
    if (activeView === 'purchases') {
      void fetchPurchases();
    } else if (activeView === 'quotes' || activeView === 'sentQuotes') {
      void fetchQuotes();
    }
  }, [activeView, fetchPurchases, fetchQuotes, role]);

  useEffect(() => {
    if (activeView !== 'system' || role !== 'admin') return;
    let cancelled = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      setSystemLoading(true);
      try {
        const response = await fetch('/api/admin/system-status', { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo consultar el diagnóstico del servidor.');
        const data = await response.json();
        if (!cancelled) {
          setSystemStatus(data);
          setSystemError('');
        }
      } catch (error) {
        if (!cancelled) setSystemError(error instanceof Error ? error.message : 'Error consultando el servidor');
      } finally {
        if (!cancelled) setSystemLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 30_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [activeView, role]);

  // Mantener sincronizadas las vistas y el historial cuando otra persona cambia un registro.
  useEffect(() => {
    const refreshActiveView = () => {
      if (document.visibilityState !== 'visible') return;

      if (activeView === 'purchases' || activeView === 'deposits' || activeView === 'sales') {
        void fetchPurchases();
      } else if (activeView === 'quotes' || activeView === 'sentQuotes') {
        void fetchQuotes();
      }
      if (selectedPassengerCedula) {
        void fetchClientHistory(selectedPassengerCedula)
          .then(history => {
            setClientHistory(history);
            setSelectedPassenger(currentPassenger => currentPassenger
              ? history.find(record => record.id === selectedPassengerId) || currentPassenger
              : null
            );
          })
          .catch(error => console.error('Error actualizando el historial de viajes:', error));
      }
      if (expandedClientKey?.startsWith('cedula:')) {
        void fetchClientHistory(expandedClientKey.slice('cedula:'.length))
          .then(setExpandedClientHistory)
          .catch(error => console.error('Error actualizando los viajes agrupados del cliente:', error));
      }
    };

    const refreshInterval = window.setInterval(refreshActiveView, 5_000);
    return () => window.clearInterval(refreshInterval);
  }, [activeView, expandedClientKey, fetchClientHistory, fetchPurchases, fetchQuotes, role, selectedPassengerCedula, selectedPassengerId]);

  useEffect(() => {
    if (!showAddModal || !lockedCedula) return;

    lockRenewalRef.current = window.setInterval(() => {
      void acquireClientLock(lockedCedula, editingBookingId || '').then(renewed => {
        if (!renewed) setLockedCedula('');
      });
    }, 30_000);

    return () => {
      if (lockRenewalRef.current !== null) {
        window.clearInterval(lockRenewalRef.current);
        lockRenewalRef.current = null;
      }
    };
  }, [showAddModal, lockedCedula, editingBookingId]);

  const [newBooking, setNewBooking] = useState({
    quoteDate: getLocalDateString(),
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
    hasDifferentReturnRoute: false,
    adultCount: 1 as number | '',
    childCount: 0 as number | '',
    childAges: [] as (number | '')[],
    serviceType: 'TIQUETE' as ServiceType,
    isTicket: true,
    isPackage: false,
    packageType: '' as PackageType | '',
    packageName: '',
    airline: '',
    paymentMethod: 'TRANSFERENCIA',
    totalValue: 0 as number | '',
    commissionAmount: '' as number | '',
    source: '' as Booking['source'] | '',
    paymentStatus: 'PENDIENTE',
    paidAmount: 0 as number | '',
    paymentDueDate: ''
  });

  const resetForm = () => {
    setOrigin('');
    setDestination('');
    setReturnOrigin('');
    setReturnDestination('');
    setNewBooking({
      quoteDate: getLocalDateString(),
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
      hasDifferentReturnRoute: false,
      adultCount: 1,
      childCount: 0,
      childAges: [],
      serviceType: 'TIQUETE',
      isTicket: true,
      isPackage: false,
      packageType: '' as PackageType | '',
      packageName: '',
      airline: '',
      paymentMethod: 'TRANSFERENCIA',
      totalValue: 0 as number | '',
      commissionAmount: '' as number | '',
      source: '' as Booking['source'] | '',
      paymentStatus: 'PENDIENTE',
      paidAmount: 0 as number | '',
      paymentDueDate: ''
    });
  };

  const handleEditClick = async (booking: Booking) => {
    if (!await acquireClientLock(booking.cedula, booking.id)) return false;

    setAddingPayment(false);
    setManualRecordType('QUOTE');
    setCompletingQuote(false);
    setEditingQuote(false);
    const routeParts = booking.route
      .split(' / ')[0]
      .split(' ➔ ')
      .map(stop => stop.trim())
      .filter(Boolean);
    const serviceType = getServiceType(booking);
    setOrigin(serviceType === 'HOTEL' ? '' : routeParts[0] || '');
    setDestination(serviceType === 'HOTEL' ? routeParts[0] || '' : routeParts[1] || '');
    setReturnOrigin(booking.returnOrigin || routeParts[1] || '');
    setReturnDestination(booking.returnDestination || routeParts[0] || '');
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
      hasDifferentReturnRoute: booking.hasDifferentReturnRoute ?? false,
      adultCount: booking.adultCount ?? 1,
      childCount: booking.childCount ?? 0,
      childAges: Array.from(
        { length: booking.childCount ?? 0 },
        (_, index) => booking.childAges?.[index] ?? ''
      ),
      serviceType,
      isTicket: serviceType === 'TIQUETE' || serviceType === 'TIQUETE_HOTEL',
      isPackage: serviceType === 'PAQUETES',
      packageType: booking.packageType ?? '',
      packageName: booking.packageName ?? '',
      airline: booking.airline,
      paymentMethod: booking.paymentMethod,
      totalValue: booking.totalValue,
      commissionAmount: booking.commissionAmount ?? '',
      source: booking.source || '',
      paymentStatus: booking.paymentStatus,
      paidAmount: booking.paidAmount,
      paymentDueDate: booking.paymentDueDate || ''
    });
    setEditingBookingId(booking.id);
    setShowAddModal(true);
    return true;
  };

  const handleEditQuoteClick = async (booking: Booking) => {
    if (!await handleEditClick(booking)) return;
    setEditingQuote(true);
  };

  const lookupClientByDocument = async () => {
    const cedula = search.trim();
    setClientHistory([]);
    setIsLoadingHistory(true);
    try {
      const history = await fetchClientHistory(cedula);
      if (!history.length) {
        window.alert('No hay viajes registrados para esta cédula.');
        return;
      }
      setClientHistory(history);
      setSelectedPassenger(history[0]);
    } catch (error) {
      console.error('Error consultando el historial de viajes por cédula:', error);
      window.alert(error instanceof Error ? error.message : 'No fue posible consultar el historial del cliente.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteClick = async (booking: Booking) => {
    if (role !== 'admin') return;

    const shouldDelete = window.confirm(`¿Deseas eliminar el registro de ${booking.passenger}?`);
    if (!shouldDelete) return;

    try {
      let response: Response;
      if (booking.purchaseDate) {
        response = await fetch(`/api/sales/${booking.id}`, { method: 'DELETE' });
      } else {
        response = await fetch(`/api/quotes/${booking.id}`, { method: 'DELETE' });
      }
      if (!response.ok) {
        throw new Error('El servidor rechazó la eliminación del registro.');
      }
    } catch (error) {
      console.error('Error eliminando registro en la base de datos:', error);
      window.alert('No fue posible eliminar el registro. Verifica tus permisos e inténtalo nuevamente.');
      return;
    }

    setBookings(currentBookings => currentBookings.filter(currentBooking => currentBooking.id !== booking.id));
    setExpandedClientHistory(currentHistory => currentHistory.filter(record => record.id !== booking.id));
    setSelectedPassenger(currentPassenger => currentPassenger?.id === booking.id ? null : currentPassenger);
  };

  const handleCompletePurchaseClick = async (booking: Booking) => {
    if (!await handleEditClick(booking)) return;
    setNewBooking(current => ({
      ...current,
      bookingCode: booking.bookingCode === 'PENDIENTE' ? '' : booking.bookingCode,
      airline: booking.airline === 'Por definir' ? '' : booking.airline,
      totalValue: booking.totalValue || '',
      commissionAmount: booking.commissionAmount ?? '',
      paidAmount: booking.paidAmount || 0,
      paymentMethod: PAYMENT_METHODS.includes(booking.paymentMethod) ? booking.paymentMethod : 'TRANSFERENCIA',
      paymentStatus: 'PENDIENTE'
    }));
    setCompletingQuote(true);
  };

  const handleRegisterPaymentClick = async (booking: Booking) => {
    if (!await handleEditClick(booking)) return;
    setAddingPayment(true);
    setNewBooking(current => ({
      ...current,
      paymentStatus: 'ABONADO',
      paidAmount: 0
    }));
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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bookingForEdit = bookings.find(booking => booking.id === editingBookingId);
    const hasPaymentAgreement = newBooking.paymentStatus === 'ABONADO' || newBooking.paymentStatus === 'PAGADO';
    const registeringPurchase = completingQuote ||
      manualRecordType === 'PURCHASE' ||
      hasPaymentAgreement ||
      Boolean(bookingForEdit?.purchaseDate);
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
    const hasInvalidRoute = !isValidLocation(destination) || (
      newBooking.serviceType !== 'HOTEL' &&
      (!isValidLocation(origin) || origin === destination)
    );
    const hasInvalidReturnRoute =
      newBooking.serviceType !== 'HOTEL' &&
      newBooking.tripType === 'ROUND_TRIP' &&
      newBooking.hasDifferentReturnRoute &&
      (
        !isValidLocation(returnOrigin) ||
        !isValidLocation(returnDestination) ||
        returnOrigin === returnDestination
      );
    const hasInvalidDates =
      !isValidDate(newBooking.travelDate) ||
      (!editingBookingId && newBooking.travelDate < getLocalDateString()) ||
      ((newBooking.serviceType === 'HOTEL' || newBooking.tripType === 'ROUND_TRIP') && (
        !isValidDate(newBooking.returnDate) ||
        newBooking.returnDate < newBooking.travelDate
      ));

    if (hasInvalidRoute || hasInvalidReturnRoute || hasInvalidDates || hasInvalidPassengerCounts) {
      window.alert('Verifica las rutas, las fechas y la cantidad de viajeros. Cada niño debe tener una edad entre 0 y 17 años.');
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

    if (
      !editingBookingId &&
      newBooking.serviceType === 'PAQUETES' &&
      !adminPackageCategories.some(category =>
        category.id === newBooking.packageType &&
        category.packages.some(travelPackage => travelPackage.title === newBooking.packageName)
      )
    ) {
      window.alert('Selecciona un paquete que esté disponible actualmente en la página principal.');
      return;
    }

    if (!editingBookingId && !['whatsapp', 'instagram', 'facebook', 'website', 'referral', 'other'].includes(newBooking.source)) {
      window.alert('Selecciona de dónde llegó el cliente.');
      return;
    }
    const totalValue = Number(newBooking.totalValue);
    const enteredCommission = newBooking.commissionAmount;
    const commissionAmount = enteredCommission === '' ? undefined : Number(enteredCommission);
    if (!editingQuote && (
      (completingQuote && commissionAmount === undefined) ||
      (commissionAmount !== undefined && (
        !Number.isSafeInteger(commissionAmount) ||
        commissionAmount < 0 ||
        commissionAmount > MAX_BOOKING_AMOUNT
      ))
    )) {
      window.alert('Ingresa una comisión válida en pesos colombianos. Puede ser $0 si no aplica.');
      return;
    }
    const enteredPaidAmount = Number(newBooking.paidAmount);
    const previousRecordedAmount = Number(bookingForEdit?.paidAmount) || 0;
    const paidAmount = addingPayment
      ? previousRecordedAmount + enteredPaidAmount
      : enteredPaidAmount;
    if (!editingQuote && (
      !Number.isFinite(totalValue) ||
      totalValue < 0 ||
      totalValue > MAX_BOOKING_AMOUNT ||
      !Number.isFinite(paidAmount) ||
      paidAmount < 0 ||
      paidAmount > totalValue ||
      (newBooking.paymentStatus === 'ABONADO' && (
        paidAmount <= 0 ||
        paidAmount > totalValue ||
        (!addingPayment && paidAmount >= totalValue) ||
        (paidAmount < totalValue && !isValidDate(newBooking.paymentDueDate))
      ))
    )) {
      window.alert('El valor total debe estar entre $0 y $1.000.000.000. El abono debe ser mayor que cero y menor que el total.');
      return;
    }

    if (
      !editingQuote &&
      !addingPayment &&
      bookingForEdit?.purchaseDate &&
      paidAmount < (Number(bookingForEdit.paidAmount) || 0)
    ) {
      window.alert('El valor abonado no puede ser menor al total de pagos ya registrados. Registra el nuevo abono acumulado.');
      return;
    }

    if (registeringPurchase && !editingBookingId && !editingQuote && (
      !newBooking.bookingCode.trim() ||
      newBooking.bookingCode.trim().length > 30 ||
      (newBooking.serviceType !== 'HOTEL' && (
        !newBooking.airline.trim() ||
        newBooking.airline.trim().length > 80
      )) ||
      totalValue <= 0
    )) {
      window.alert('Completa el código de reserva, la aerolínea y un precio mayor que cero para registrar la compra.');
      return;
    }

    const previousLockedCedula = lockedCedula;
    if (!await acquireClientLock(newBooking.cedula, editingBookingId || '')) return;
    if (previousLockedCedula && previousLockedCedula !== newBooking.cedula) {
      await releaseClientLock(previousLockedCedula);
    }

    const finalRoute = newBooking.serviceType === 'HOTEL'
      ? destination
      : formatBookingRoute({
        origin,
        destination,
        tripType: newBooking.tripType,
        hasDifferentReturnRoute: newBooking.hasDifferentReturnRoute,
        returnOrigin,
        returnDestination
      });
    const firstName = newBooking.firstName.trim();
    const lastName = newBooking.lastName.trim();
    const passengerName = joinName(firstName, lastName);
    const existingBooking = bookingForEdit;
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
      hasDifferentReturnRoute:
        newBooking.serviceType !== 'HOTEL' &&
        newBooking.tripType === 'ROUND_TRIP' &&
        newBooking.hasDifferentReturnRoute,
      returnOrigin: newBooking.serviceType !== 'HOTEL' && newBooking.tripType === 'ROUND_TRIP'
        ? newBooking.hasDifferentReturnRoute ? returnOrigin : destination
        : '',
      returnDestination: newBooking.serviceType !== 'HOTEL' && newBooking.tripType === 'ROUND_TRIP'
        ? newBooking.hasDifferentReturnRoute ? returnDestination : origin
        : '',
      adultCount: Number(newBooking.adultCount),
      childCount: Number(newBooking.childCount),
      childAges: newBooking.childAges.map(Number),
      serviceType: newBooking.serviceType,
      isTicket: newBooking.serviceType === 'TIQUETE' || newBooking.serviceType === 'TIQUETE_HOTEL',
      isPackage: newBooking.serviceType === 'PAQUETES',
      packageType: newBooking.isPackage ? newBooking.packageType || undefined : undefined,
      packageName: newBooking.isPackage ? newBooking.packageName.trim() || undefined : undefined,
      passengers: editingBookingId && existingBooking?.passengers.length
        ? [primaryPassenger, ...existingBooking.passengers.slice(1)]
        : [primaryPassenger]
    };

    if (editingQuote && editingBookingId) {
      const updatedQuote: Booking = {
        bookingCode: 'PENDIENTE',
        airline: 'Por definir',
        paymentMethod: 'PENDIENTE',
        totalValue: 0,
        paymentStatus: 'PENDIENTE',
        paidAmount: 0,
        ...existingBooking,
        quoteDate: existingBooking?.quoteDate || newBooking.quoteDate,
        quoteStatus: existingBooking?.quoteStatus === 'SENT' ? 'PENDING' : existingBooking?.quoteStatus || 'PENDING',
        ...quoteData,
        purchaseDate: existingBooking?.purchaseDate || '',
        id: editingBookingId
      };

      try {
        setIsSaving(true);
        const res = await fetch(`/api/quotes/${editingBookingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedQuote)
        });

        if (!res.ok) {
          throw new Error('Error al actualizar la cotización en el servidor.');
        }

        setBookings(currentBookings => currentBookings.map(booking => booking.id === editingBookingId
          ? updatedQuote
          : booking
        ));
      } catch (error) {
        console.error('Error actualizando cotización en la base de datos:', error);
        window.alert('No fue posible actualizar la cotización en la base de datos. Verifica tu conexión.');
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }

      setShowAddModal(false);
      setEditingBookingId(null);
      setAddingPayment(false);
      setManualRecordType('QUOTE');
      setEditingQuote(false);
      await releaseClientLock(newBooking.cedula);
      resetForm();
      void fetchQuotes();
      return;
    }

    const purchaseDate = registeringPurchase
      ? existingBooking?.purchaseDate || newBooking.purchaseDate || getLocalDateString()
      : existingBooking?.purchaseDate || '';
    const finalPaidAmount = newBooking.paymentStatus === 'PAGADO'
      ? totalValue
      : Math.min(paidAmount, totalValue);
    const finalPaymentStatus = finalPaidAmount <= 0
      ? 'PENDIENTE'
      : finalPaidAmount >= totalValue
        ? 'PAGADO'
        : 'ABONADO';
    const previousPaidAmount = Number(existingBooking?.paidAmount) || 0;
    const paymentHistory = existingBooking ? getPaymentHistory(existingBooking) : [];
    const nextPaymentHistory = finalPaidAmount > previousPaidAmount
      ? [...paymentHistory, {
        amount: finalPaidAmount - previousPaidAmount,
        date: getLocalDateString(),
        method: newBooking.paymentMethod
      }]
      : paymentHistory;
    // Empty commission inputs are not persisted as strings; historical values remain unset.
    const { commissionAmount: _draftCommission, ...bookingFields } = newBooking;
    const bookingData = {
      ...bookingFields,
      paymentMethod: completingQuote && !PAYMENT_METHODS.includes(newBooking.paymentMethod)
        ? 'TRANSFERENCIA'
        : newBooking.paymentMethod,
      purchaseDate,
      ...quoteData,
      totalValue,
      ...(commissionAmount !== undefined ? { commissionAmount } : {}),
      paymentStatus: finalPaymentStatus,
      paidAmount: finalPaidAmount,
      paymentDueDate: finalPaymentStatus === 'ABONADO' ? newBooking.paymentDueDate : '',
      advisorEmail: existingBooking?.advisorEmail,
      paymentHistory: nextPaymentHistory
    };

    const finalId = completingQuote ? crypto.randomUUID() : editingBookingId || crypto.randomUUID();
    const finalBooking: Booking = {
      ...bookingData,
      id: finalId,
      purchaseDate,
      ...(completingQuote && editingBookingId ? { originQuoteId: editingBookingId } : {})
    };

    if (completingQuote) {
      try {
        setIsSaving(true);
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId: editingBookingId,
            ...finalBooking
          })
        });

        if (!res.ok) {
          throw new Error('Error al registrar compra y mover a ventas realizadas.');
        }

        setBookings(currentBookings => {
          const filtered = currentBookings.filter(b => b.id !== editingBookingId);
          return [finalBooking, ...filtered];
        });
      } catch (error) {
        console.error('Error registrando la compra en la base de datos:', error);
        window.alert('No fue posible mover la cotización a compras en la base de datos. Verifica tu conexión.');
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    } else if (editingBookingId) {
      try {
        setIsSaving(true);
        const res = await fetch(`/api/sales/${editingBookingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalBooking)
        });

        if (!res.ok) {
          throw new Error('Error al actualizar la compra en el servidor.');
        }

        setBookings(currentBookings => currentBookings.map(booking => booking.id === editingBookingId
          ? finalBooking
          : booking
        ));
      } catch (error) {
        console.error('Error actualizando compra en base de datos:', error);
        window.alert('No fue posible actualizar la compra en la base de datos. Verifica tu conexión.');
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    } else {
      const created: Booking = {
        id: finalId,
        ...bookingData
      };

      try {
        setIsSaving(true);
        const isPurchase = registeringPurchase;
        const response = await fetch(isPurchase ? '/api/sales' : '/api/quotes/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(created)
        });
        const result: { error?: string } = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'No fue posible guardar el cliente.');
        }

        setBookings(currentBookings => [created, ...currentBookings]);
      } catch (error) {
        console.error('Error guardando cliente/venta manual en la base de datos:', error);
        const message = error instanceof Error ? error.message : 'Error desconocido.';
        window.alert(`No fue posible guardar el cliente en la base de datos: ${message}`);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    setShowAddModal(false);
    setEditingBookingId(null);
    setCompletingQuote(false);
    setEditingQuote(false);
    await releaseClientLock(newBooking.cedula);
    resetForm();

    const requestedView = registeringPurchase ? 'purchases' : 'quotes';
    const targetView = role === 'admin' ? requestedView : 'quotes';
    setActiveView(targetView);
    if (targetView === 'purchases') {
      void fetchPurchases();
    } else if (targetView === 'quotes') {
      void fetchQuotes();
    }
  };

  const searchTerm = search.trim().toLowerCase();
  const matchesSearch = (booking: Booking) =>
    !searchTerm ||
    (booking.passenger || '').toLowerCase().includes(searchTerm) ||
    (booking.phone || '').toLowerCase().includes(searchTerm) ||
    (booking.cedula || '').toLowerCase().includes(searchTerm) ||
    normalizeClientIdentifier(booking.cedula || '').includes(normalizeClientIdentifier(searchTerm));
  const pendingQuoteGroups = groupBookingsByClient(bookings.filter(booking =>
    !booking.purchaseDate && booking.quoteStatus !== 'SENT' && booking.quoteStatus !== 'PURCHASED'
  ))
    .filter(group => group.bookings.some(matchesSearch));
  const sentQuoteGroups = groupBookingsByClient(bookings.filter(booking =>
    !booking.purchaseDate && booking.quoteStatus === 'SENT'
  ))
    .filter(group => group.bookings.some(matchesSearch));
  const purchaseGroups = groupBookingsByClient(bookings.filter(booking => Boolean(booking.purchaseDate)))
    .filter(group => group.bookings.some(matchesSearch));
  const allPurchases = bookings.filter(booking => Boolean(booking.purchaseDate));
  const depositPurchases = allPurchases.filter(booking => {
    const total = Number(booking.totalValue) || 0;
    const paid = Number(booking.paidAmount) || 0;
    return paid > 0 && paid < total;
  }).filter(matchesSearch);
  const filteredSales = allPurchases.filter(booking => {
    if (salesPeriod === 'all') return true;
    if (salesPeriod === 'month') return Boolean(selectedSalesMonth) && booking.purchaseDate.startsWith(selectedSalesMonth);
    return booking.purchaseDate.startsWith(`${selectedSalesYear}-`);
  });
  const salesYears = [...new Set([
    getLocalDateString().slice(0, 4),
    ...allPurchases
      .map(booking => booking.purchaseDate.slice(0, 4))
      .filter(year => /^\d{4}$/.test(year))
  ])].sort((first, second) => Number(second) - Number(first));
  const salesTotal = filteredSales.reduce((total, booking) => total + (Number(booking.totalValue) || 0), 0);
  const salesCommissions = filteredSales.reduce((total, booking) => total + (booking.commissionAmount ?? 0), 0);
  const unrecordedCommissions = filteredSales.filter(booking => booking.commissionAmount == null).length;
  const salesByChannel = Object.entries(
    filteredSales.reduce<Record<string, { count: number; sold: number; commissions: number }>>((acc, booking) => {
      const channel = booking.source && CLIENT_SOURCE_LABELS[booking.source] ? booking.source : 'unknown';
      const entry = acc[channel] || { count: 0, sold: 0, commissions: 0 };
      entry.count += 1;
      entry.sold += Number(booking.totalValue) || 0;
      entry.commissions += Number(booking.commissionAmount) || 0;
      acc[channel] = entry;
      return acc;
    }, {})
  ).sort((a, b) => b[1].sold - a[1].sold);
  const salesCollected = filteredSales.reduce((total, booking) => total + (Number(booking.paidAmount) || 0), 0);
  const salesBalance = filteredSales.reduce(
    (total, booking) => total + Math.max(0, (Number(booking.totalValue) || 0) - (Number(booking.paidAmount) || 0)),
    0
  );
  const filteredClientGroups = activeView === 'quotes'
    ? pendingQuoteGroups
    : activeView === 'sentQuotes' ? sentQuoteGroups : purchaseGroups;
  const adminPackageCategories = getAvailablePackageCategories(getLocalDateString());
  const selectedAdminPackageValue = newBooking.packageType && newBooking.packageName
    ? `${newBooking.packageType}::${newBooking.packageName}`
    : '';
  const isHistoricalPackage = Boolean(newBooking.packageType && newBooking.packageName) &&
    !adminPackageCategories.some(category =>
      category.id === newBooking.packageType &&
      category.packages.some(travelPackage => travelPackage.title === newBooking.packageName)
    );
  const editedPurchaseAmount = Number(bookings.find(booking => booking.id === editingBookingId)?.paidAmount) || 0;

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
            setAddingPayment(false);
            setManualRecordType('QUOTE');
            setLockedCedula('');
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
      {activeView !== 'sales' && <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar cliente por Nombre, Cédula o Celular..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '1rem' }}
        />
        {/^[a-z\d]{5,15}$/i.test(search.trim()) && (
          <button
            type="button"
            disabled={isLoadingHistory}
            onClick={() => void lookupClientByDocument()}
            style={{ marginTop: '8px', padding: '9px 14px', border: '1px solid #2D60A8', borderRadius: '8px', color: '#2D60A8', background: '#fff', fontWeight: 'bold', cursor: isLoadingHistory ? 'wait' : 'pointer' }}
          >
            {isLoadingHistory ? 'Consultando historial...' : 'Consultar todos los viajes de esta cédula'}
          </button>
        )}
      </div>}

      <div role="tablist" aria-label="Secciones de administración" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #d1d5db' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'quotes'}
          onClick={() => {
            setActiveView('quotes');
            void fetchQuotes();
          }}
          style={{ padding: '12px 18px', border: 'none', borderBottom: activeView === 'quotes' ? '3px solid #E3B31D' : '3px solid transparent', backgroundColor: 'transparent', color: activeView === 'quotes' ? '#2D60A8' : '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Cotizaciones pendientes ({pendingQuoteGroups.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'sentQuotes'}
          onClick={() => {
            setActiveView('sentQuotes');
            void fetchQuotes();
          }}
          style={{ padding: '12px 18px', border: 'none', borderBottom: activeView === 'sentQuotes' ? '3px solid #E3B31D' : '3px solid transparent', backgroundColor: 'transparent', color: activeView === 'sentQuotes' ? '#2D60A8' : '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Cotizaciones enviadas ({sentQuoteGroups.length})
        </button>
        {role === 'admin' && <button
          type="button"
          role="tab"
          aria-selected={activeView === 'purchases'}
          onClick={() => {
            setActiveView('purchases');
            void fetchPurchases();
          }}
          style={{ padding: '12px 18px', border: 'none', borderBottom: activeView === 'purchases' ? '3px solid #E3B31D' : '3px solid transparent', backgroundColor: 'transparent', color: activeView === 'purchases' ? '#2D60A8' : '#6b7280', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>Compras registradas ({purchaseGroups.length})</span>
          {isLoadingPurchases && <span style={{ fontSize: '0.8rem' }}>🔄</span>}
        </button>}
        {role === 'admin' && <button
          type="button"
          role="tab"
          aria-selected={activeView === 'sales'}
          onClick={() => {
            setActiveView('sales');
            void fetchPurchases();
          }}
          style={{ padding: '12px 18px', border: 'none', borderBottom: activeView === 'sales' ? '3px solid #E3B31D' : '3px solid transparent', backgroundColor: 'transparent', color: activeView === 'sales' ? '#2D60A8' : '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Registro de ventas
        </button>}
        {role === 'admin' && <button
          type="button"
          role="tab"
          aria-selected={activeView === 'deposits'}
          onClick={() => {
            setActiveView('deposits');
            void fetchPurchases();
          }}
          style={{ padding: '12px 18px', border: 'none', borderBottom: activeView === 'deposits' ? '3px solid #E3B31D' : '3px solid transparent', backgroundColor: 'transparent', color: activeView === 'deposits' ? '#2D60A8' : '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Clientes abonados ({depositPurchases.length})
        </button>}
        {role === 'admin' && <button
          type="button"
          role="tab"
          aria-selected={activeView === 'system'}
          onClick={() => setActiveView('system')}
          style={{ padding: '12px 18px', border: 'none', borderBottom: activeView === 'system' ? '3px solid #E3B31D' : '3px solid transparent', background: 'transparent', color: activeView === 'system' ? '#2D60A8' : '#6b7280', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Estado del sistema
        </button>}
      </div>

      {/* Tabla estilo Excel */}
      {activeView === 'system' && role === 'admin' ? (
        <section className="system-monitor" aria-label="Estado del sistema">
          <div className="system-monitor__heading">
            <div>
              <h3>Estado del sistema WDTravel</h3>
              <p>Comprobaciones de solo lectura. Actualización cada 30 segundos mientras esta pestaña está visible.</p>
            </div>
            <span className="system-monitor__badge">{systemLoading ? 'Consultando…' : systemError ? 'Sin conexión' : systemStatus?.status === 'healthy' ? 'Operativo' : systemStatus ? 'Degradado' : 'Sin datos'}</span>
          </div>
          {systemError && <p role="alert" className="system-monitor__error">{systemError}</p>}
          {systemStatus ? (
            <>
              <div className="system-monitor__metrics">
                <div><span>Tiempo activo</span><strong>{Math.floor(systemStatus.uptimeSeconds / 3600)} h {Math.floor(systemStatus.uptimeSeconds % 3600 / 60)} min</strong></div>
                <div><span>Memoria RSS</span><strong>{systemStatus.memoryMb.rss} MB</strong></div>
                <div><span>Peticiones desde el arranque</span><strong>{systemStatus.requestsSinceStart}</strong></div>
                <div><span>Errores HTTP 5xx desde el arranque</span><strong>{systemStatus.serverErrorsSinceStart}</strong></div>
              </div>
              <h4>Dependencias críticas</h4>
              <div className="system-monitor__checks">
                {systemStatus.checks.map(check => (
                  <div key={check.name} className="system-monitor__check">
                    <strong>{check.name === 'mongodb' ? 'MongoDB Atlas' : check.name === 'quotes' ? 'Cotizaciones' : 'Compras realizadas'}</strong>
                    <span>{check.status === 'ok' ? '✓ Disponible' : '⚠ Fallo'} · {check.latencyMs} ms</span>
                  </div>
                ))}
              </div>
              <h4>Errores HTTP recientes</h4>
              {systemStatus.recentErrors.length ? (
                <ul className="system-monitor__errors">
                  {systemStatus.recentErrors.map((error, index) => (
                    <li key={index}>{new Date(error.at).toLocaleString('es-CO')} · HTTP {error.status} · {error.durationMs} ms</li>
                  ))}
                </ul>
              ) : <p>No se han registrado errores HTTP 5xx desde el último reinicio.</p>}
              <p className="system-monitor__note">Última comprobación: {new Date(systemStatus.checkedAt).toLocaleString('es-CO')}. Las métricas se reinician cuando Render reinicia el servidor. La lectura correcta no garantiza todos los flujos de negocio.</p>
            </>
          ) : <p>Esperando el primer diagnóstico…</p>}
        </section>
      ) : activeView === 'sales' ? (
        <section aria-label="Resumen de ventas e ingresos">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: '12px', padding: '18px', marginBottom: '18px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div>
              <label htmlFor="sales-period" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Mostrar ventas por:</label>
              <select
                id="sales-period"
                value={salesPeriod}
                onChange={event => setSalesPeriod(event.target.value as 'all' | 'month' | 'year')}
                style={{ minWidth: '180px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
              >
                <option value="all">Todo el historial</option>
                <option value="month">Mes</option>
                <option value="year">Año</option>
              </select>
            </div>
            {salesPeriod === 'month' ? (
              <div>
                <label htmlFor="sales-month" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Mes:</label>
                <input
                  id="sales-month"
                  type="month"
                  value={selectedSalesMonth}
                  onChange={event => setSelectedSalesMonth(event.target.value)}
                  style={{ minWidth: '180px', padding: '9px', borderRadius: '8px' }}
                />
              </div>
            ) : salesPeriod === 'year' ? (
              <div>
                <label htmlFor="sales-year" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#374151' }}>Año:</label>
                <select
                  id="sales-year"
                  value={selectedSalesYear}
                  onChange={event => setSelectedSalesYear(event.target.value)}
                  style={{ minWidth: '180px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                >
                  {salesYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            ) : null}
            <p style={{ margin: '0 0 10px', color: '#6b7280' }}>
              Período: <strong style={{ color: '#374151' }}>
                {salesPeriod === 'month'
                  ? selectedSalesMonth
                    ? new Date(`${selectedSalesMonth}-01T00:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
                    : 'Selecciona un mes'
                  : salesPeriod === 'year' ? selectedSalesYear : 'Todas las fechas'}
              </strong>
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <article style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px', borderLeft: '5px solid #2D60A8', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: '0 0 8px', color: '#6b7280', fontWeight: 'bold' }}>Ventas registradas</p>
              <strong style={{ color: '#2D60A8', fontSize: '1.5rem' }}>{formatCurrency(salesTotal)}</strong>
              <p style={{ margin: '8px 0 0', color: '#6b7280' }}>{filteredSales.length} venta(s)</p>
            </article>
            <article style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px', borderLeft: '5px solid #16a34a', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: '0 0 8px', color: '#6b7280', fontWeight: 'bold' }}>Ingresos recibidos</p>
              <strong style={{ color: '#16a34a', fontSize: '1.5rem' }}>{formatCurrency(salesCollected)}</strong>
            </article>
            <article style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '12px', borderLeft: '5px solid #d97706', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: '0 0 8px', color: '#6b7280', fontWeight: 'bold' }}>Saldo por cobrar</p>
              <strong style={{ color: '#d97706', fontSize: '1.5rem' }}>{formatCurrency(salesBalance)}</strong>
            </article>
          </div>

          <div style={{ padding: '20px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px', color: '#1e40af', fontWeight: 'bold' }}>Margen acumulado por comisiones registradas</p>
            <strong style={{ color: '#1e40af', fontSize: '1.7rem' }}>{formatCurrency(salesCommissions)}</strong>
            <p style={{ margin: '8px 0 0', color: '#526981', fontSize: '0.85rem' }}>
              Suma de comisiones de las ventas del período seleccionado. No equivale a utilidad neta ni necesariamente a dinero ya cobrado.
              {unrecordedCommissions > 0 && ` Hay ${unrecordedCommissions} venta(s) sin comisión registrada, excluidas del acumulado.`}
            </p>
          </div>
          <div style={{ overflowX: 'auto', marginBottom: '18px', padding: '16px', borderRadius: '12px', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <h3 style={{ marginTop: 0, color: '#2D60A8' }}>Ventas por canal de origen</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Resumen del período seleccionado. Las comisiones no registradas no se contabilizan.</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead><tr>
                <th style={{ padding: '10px' }}>CANAL</th>
                <th style={{ padding: '10px' }}>VENTAS</th>
                <th style={{ padding: '10px' }}>TOTAL VENDIDO</th>
                <th style={{ padding: '10px' }}>COMISIONES</th>
              </tr></thead>
              <tbody>
                {salesByChannel.map(([channel, values]) => (
                  <tr key={channel} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{channel === 'unknown' ? 'Sin registrar' : getClientSourceLabel(channel)}</td>
                    <td style={{ padding: '10px' }}>{values.count}</td>
                    <td style={{ padding: '10px' }}>{formatCurrency(values.sold)}</td>
                    <td style={{ padding: '10px' }}>{formatCurrency(values.commissions)}</td>
                  </tr>
                ))}
                {!salesByChannel.length && <tr><td colSpan={4} style={{ padding: '12px' }}>No hay ventas en el período seleccionado.</td></tr>}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '0.9rem' }}>
            El resumen muestra ventas y pagos registrados; no calcula utilidad neta porque no incluye costos o gastos.
          </p>

          <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#2D60A8', color: '#fff' }}>
                  <th style={{ padding: '14px' }}>FECHA DE COMPRA</th>
                  <th style={{ padding: '14px' }}>CLIENTE</th>
                  <th style={{ padding: '14px' }}>RUTA</th>
                  <th style={{ padding: '14px' }}>MÉTODO DE PAGO</th>
                  <th style={{ padding: '14px' }}>VALOR VENDIDO</th>
                  <th style={{ padding: '14px' }}>COMISIÓN</th>
                  <th style={{ padding: '14px' }}>ORIGEN</th>
                  <th style={{ padding: '14px' }}>RECIBIDO</th>
                  <th style={{ padding: '14px' }}>SALDO PENDIENTE</th>
                  <th style={{ padding: '14px' }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No hay ventas registradas en este período.</td></tr>
                ) : filteredSales.map(booking => (
                  <tr key={booking.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px' }}>{formatDisplayDate(booking.purchaseDate)}</td>
                    <td style={{ padding: '14px', fontWeight: 'bold' }}>{booking.passenger}</td>
                    <td style={{ padding: '14px' }}>{getBookingRoute(booking)}</td>
                    <td style={{ padding: '14px' }}>{booking.paymentMethod}</td>
                    <td style={{ padding: '14px' }}>{formatCurrency(booking.totalValue)}</td>
                    <td style={{ padding: '14px', color: '#1e40af', fontWeight: 'bold' }}>{booking.commissionAmount == null ? 'Sin registrar' : formatCurrency(booking.commissionAmount)}</td>
                    <td style={{ padding: '14px' }}>{getClientSourceLabel(booking.source)}</td>
                    <td style={{ padding: '14px', color: '#16a34a' }}>{formatCurrency(Number(booking.paidAmount) || 0)}</td>
                    <td style={{ padding: '14px', color: (Number(booking.totalValue) || 0) - (Number(booking.paidAmount) || 0) > 0 ? '#d97706' : '#16a34a' }}>
                      {formatCurrency(Math.max(0, (Number(booking.totalValue) || 0) - (Number(booking.paidAmount) || 0)))}
                    </td>
                    <td style={{ padding: '14px', fontWeight: 'bold' }}>{booking.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeView === 'deposits' ? (
        <section aria-label="Clientes abonados con saldo pendiente">
          <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#2D60A8', color: '#fff' }}>
                  <th style={{ padding: '14px' }}>CLIENTE</th>
                  <th style={{ padding: '14px' }}>TELÉFONO</th>
                  <th style={{ padding: '14px' }}>VALOR TOTAL</th>
                  <th style={{ padding: '14px' }}>VALOR ABONADO</th>
                  <th style={{ padding: '14px' }}>SALDO PENDIENTE</th>
                  <th style={{ padding: '14px' }}>FECHA LÍMITE DE PAGO</th>
                  <th style={{ padding: '14px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {depositPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                      {isLoadingPurchases ? 'Cargando compras registradas...' : 'No hay compras abonadas con saldo pendiente.'}
                    </td>
                  </tr>
                ) : depositPurchases.map(booking => {
                  const balance = Math.max(0, (Number(booking.totalValue) || 0) - (Number(booking.paidAmount) || 0));
                  const dueState = getPaymentDueState(booking.paymentDueDate || '', getLocalDateString());
                  const dueColor = dueState === 'Vencido' ? '#b91c1c' : dueState === 'Próximo' ? '#b45309' : '#166534';
                  const paymentHistory = getPaymentHistory(booking);
                  const historyExpanded = expandedPaymentId === booking.id;
                  return (
                    <React.Fragment key={booking.id}>
                      <tr style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: dueState === 'Vencido' ? '#fef2f2' : '#fff' }}>
                        <td style={{ padding: '14px', fontWeight: 'bold' }}>
                          {booking.passenger}
                          <div style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#6b7280' }}>Cédula: {booking.cedula || 'No registrada'}</div>
                        </td>
                        <td style={{ padding: '14px' }}>{formatPhoneForDisplay(booking.phone)}</td>
                        <td style={{ padding: '14px' }}>{formatCurrency(Number(booking.totalValue) || 0)}</td>
                        <td style={{ padding: '14px', color: '#166534', fontWeight: 'bold' }}>{formatCurrency(Number(booking.paidAmount) || 0)}</td>
                        <td style={{ padding: '14px', color: '#b45309', fontWeight: 'bold' }}>{formatCurrency(balance)}</td>
                        <td style={{ padding: '14px', color: dueColor, fontWeight: 'bold' }}>
                          {booking.paymentDueDate ? formatDisplayDate(booking.paymentDueDate) : 'Sin fecha'}
                          <div style={{ fontSize: '0.8rem' }}>{dueState}</div>
                        </td>
                        <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => void handleRegisterPaymentClick(booking)}
                            style={{ margin: '3px', padding: '7px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Registrar abono
                          </button>
                          <button
                            type="button"
                            aria-expanded={historyExpanded}
                            onClick={() => setExpandedPaymentId(historyExpanded ? null : booking.id)}
                            style={{ margin: '3px', padding: '7px 10px', backgroundColor: '#e2e8f0', color: '#1f2937', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            {historyExpanded ? 'Ocultar pagos' : `Historial (${paymentHistory.length})`}
                          </button>
                        </td>
                      </tr>
                      {historyExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: '14px 22px', backgroundColor: '#f8fafc' }}>
                            <strong>Historial de pagos de {booking.passenger}</strong>
                            {paymentHistory.length ? (
                              <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                                {paymentHistory.map((payment, index) => (
                                  <li key={`${booking.id}-payment-${index}`}>
                                    {payment.date ? formatDisplayDate(payment.date) : 'Fecha no registrada'} · {formatCurrency(payment.amount)} · {payment.method || 'Método no registrado'}
                                  </li>
                                ))}
                              </ul>
                            ) : <p style={{ marginBottom: 0 }}>No hay pagos individuales registrados.</p>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#2D60A8', color: '#fff' }}>
              <th style={{ padding: '14px' }}>CLIENTE</th>
              <th style={{ padding: '14px' }}>CÉDULA</th>
              <th style={{ padding: '14px' }}>CELULAR</th>
              <th style={{ padding: '14px' }}>VIAJES EN ESTA SECCIÓN</th>
              <th style={{ padding: '14px' }}>HISTORIAL COMPLETO</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientGroups.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                  {activeView === 'quotes'
                    ? 'No hay cotizaciones pendientes.'
                    : activeView === 'sentQuotes'
                      ? 'No hay cotizaciones enviadas pendientes de compra.'
                    : isLoadingPurchases
                      ? 'Cargando compras registradas desde la base de datos...'
                      : 'Todavía no hay compras registradas.'}
                </td>
              </tr>
            ) : filteredClientGroups.map(group => {
              const client = group.bookings[0];
              const expanded = expandedClientKey === group.key;
              return (
                <React.Fragment key={group.key}>
                  <tr style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: expanded ? '#f8fafc' : '#fff' }}>
                    <td style={{ padding: '14px', fontWeight: 'bold', color: '#111827' }}>
                      {client.passenger || 'Cliente sin nombre'}
                      <div style={{ marginTop: '4px', fontWeight: 'normal', fontSize: '0.85rem', color: '#4b5563' }}>
                        {client.documentType || 'Documento no especificado'}
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>{client.cedula || 'No registrada'}</td>
                    <td style={{ padding: '14px' }}>{formatPhoneForDisplay(client.phone)}</td>
                    <td style={{ padding: '14px' }}>
                      {group.bookings.length} registro(s) de {activeView === 'purchases' ? 'compra' : 'cotización'}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => void toggleClientHistory(group.key, client, group.bookings)}
                        style={{ padding: '7px 12px', backgroundColor: expanded ? '#e2e8f0' : '#2D60A8', color: expanded ? '#1f2937' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        {expanded ? 'Ocultar viajes' : 'Ver viajes'}
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px 22px 22px', backgroundColor: '#f8fafc' }}>
                        <h3 style={{ margin: '0 0 14px', color: '#1f3f70' }}>
                          Historial de viajes de {client.passenger || 'este cliente'}
                        </h3>
                        {isLoadingExpandedHistory ? (
                          <p role="status">Consultando cotizaciones y compras...</p>
                        ) : expandedClientHistory.length === 0 ? (
                          <p>No hay viajes registrados para esta cédula.</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {expandedClientHistory.map((trip, index) => {
                              const serviceType = getServiceType(trip);
                              const tripRoute = getBookingRoute(trip) || 'Destino no registrado';
                              const isQuote = trip.recordType === 'quote';
                              return (
                                <article key={`${trip.recordType}-${trip.id}`} style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #dbe3ee', borderRadius: '10px' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                                    <strong style={{ color: '#1f3f70' }}>
                                      Viaje {index + 1} · {isQuote
                                        ? trip.quoteStatus === 'PURCHASED' ? 'Cotización original (compra realizada)' : 'Cotización'
                                        : 'Compra'}
                                    </strong>
                                    <span style={{ color: '#4b5563' }}>
                                      {isQuote && trip.quoteStatus === 'SENT'
                                        ? `Enviada: ${formatDisplayDate(trip.sentAt || trip.quoteDate || trip.purchaseDate)}`
                                        : `Registrado: ${formatDisplayDate(isQuote ? (trip.quoteDate || trip.purchaseDate) : trip.purchaseDate)}`}
                                    </span>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px 18px', color: '#374151' }}>
                                    {isQuote && <div><strong>Asesor responsable:</strong> {trip.advisorEmail || 'Pendiente de asignación'}</div>}
                                    {isQuote && <div><strong>Estado de cotización:</strong> {trip.quoteStatus === 'PURCHASED' ? 'Compra registrada' : trip.quoteStatus === 'SENT' ? 'Enviada' : 'Pendiente'}</div>}
                                    <div><strong>Destino / ruta:</strong> {tripRoute}</div>
                                    <div><strong>Servicio:</strong> {SERVICE_TYPE_LABELS[serviceType]}
                                      {trip.packageType ? ` · ${getPackageTypeLabel(trip.packageType)}` : ''}
                                      {trip.packageName ? ` · ${trip.packageName}` : ''}
                                    </div>
                                    <div><strong>Fecha de viaje:</strong> {formatDisplayDate(trip.travelDate)}</div>
                                    <div><strong>Fecha de regreso / salida:</strong> {trip.returnDate ? formatDisplayDate(trip.returnDate) : '—'}</div>
                                    <div><strong>Tipo de viaje:</strong> {serviceType === 'HOTEL'
                                      ? 'Estadía'
                                      : (trip.tripType ?? (trip.returnDate ? 'ROUND_TRIP' : 'ONE_WAY')) === 'ROUND_TRIP' ? 'Ida y vuelta' : 'Solo ida'}</div>
                                    <div><strong>Código de reserva:</strong> {trip.bookingCode || 'PENDIENTE'}</div>
                                    <div><strong>Aerolínea:</strong> {trip.airline || 'Por definir'}</div>
                                    <div><strong>Viajeros:</strong> {trip.adultCount ?? 'Sin dato'} adulto(s), {trip.childCount ?? 'Sin dato'} niño(s)
                                      {(trip.childAges?.length ?? 0) > 0 ? ` · Edades: ${trip.childAges?.join(', ')}` : ''}
                                    </div>
                                    <div><strong>Pasajeros:</strong> {trip.passengers?.length
                                      ? trip.passengers.map(passenger => `${passenger.name} (${passenger.documentType || 'Documento'}: ${passenger.cedula})`).join('; ')
                                      : trip.passenger || 'Sin dato'}</div>
                                    {!isQuote && <>
                                      <div><strong>Estado del pago:</strong> {trip.paymentStatus || 'Sin dato'}</div>
                                      <div><strong>Valor / abonado:</strong> {formatCurrency(Number(trip.totalValue) || 0)} / {formatCurrency(Number(trip.paidAmount) || 0)}</div>
                                      <div><strong>Método de pago:</strong> {trip.paymentMethod || 'Sin dato'}</div>
                                      {trip.paymentDueDate && <div><strong>Fecha límite de pago:</strong> {formatDisplayDate(trip.paymentDueDate)}</div>}
                                      {getPaymentHistory(trip).length > 0 && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                          <strong>Historial de pagos:</strong>
                                          {getPaymentHistory(trip).map((payment, paymentIndex) => (
                                            <div key={`${trip.id}-history-${paymentIndex}`}>
                                              {payment.date ? formatDisplayDate(payment.date) : 'Fecha no registrada'} · {formatCurrency(payment.amount)} · {payment.method || 'Método no registrado'}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </>}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                                    {isQuote && trip.quoteStatus !== 'PURCHASED' && (
                                      <button
                                        type="button"
                                        onClick={() => void handleCompletePurchaseClick(trip)}
                                        style={{ padding: '6px 12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                      >
                                        Completar compra
                                      </button>
                                    )}
                                    {!isQuote && (Number(trip.paidAmount) || 0) < (Number(trip.totalValue) || 0) && (
                                      <button
                                        type="button"
                                        onClick={() => void handleRegisterPaymentClick(trip)}
                                        style={{ padding: '6px 12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                      >
                                        Registrar abono
                                      </button>
                                    )}
                                    {isQuote && trip.quoteStatus !== 'PURCHASED' && (
                                      <button
                                        type="button"
                                        onClick={() => void handleQuoteStatusChange(trip, trip.quoteStatus === 'SENT' ? 'PENDING' : 'SENT')}
                                        style={{ padding: '6px 12px', backgroundColor: trip.quoteStatus === 'SENT' ? '#e2e8f0' : '#2D60A8', color: trip.quoteStatus === 'SENT' ? '#1f2937' : '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                      >
                                        {trip.quoteStatus === 'SENT' ? 'Devolver a pendientes' : 'Marcar cotización como enviada'}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => isQuote
                                        ? trip.quoteStatus === 'PURCHASED' ? undefined : void handleEditQuoteClick(trip)
                                        : void handleEditClick(trip)}
                                      disabled={isQuote && trip.quoteStatus === 'PURCHASED'}
                                      style={{ padding: '6px 12px', backgroundColor: '#E3B31D', color: '#2D60A8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                      Editar viaje
                                    </button>
                                    {role === 'admin' && (
                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteClick(trip)}
                                        style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                      >
                                        Eliminar viaje
                                      </button>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>}

      {/* Modal: Perfil Detallado */}
      {selectedPassenger && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ color: '#2D60A8', marginTop: 0, borderBottom: '2px solid #E3B31D', paddingBottom: '10px' }}>👤 Perfil del Cliente</h3>
            <p style={{ marginTop: '15px' }}><strong>Nombre:</strong> {selectedPassenger.passenger}</p>
            <p><strong>{selectedPassenger.documentType || 'Número de identidad'}:</strong> {selectedPassenger.cedula || 'No registrado'}</p>
            <section style={{ margin: '16px 0', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <strong>Historial de viajes asociado a esta cédula</strong>
              {isLoadingHistory ? (
                <p>Consultando cotizaciones y compras...</p>
              ) : clientHistory.length ? clientHistory.map((trip, index) => (
                <div key={`${trip.recordType}-${trip.id}-${index}`} style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                  <strong>{trip.recordType === 'purchase' ? 'Compra registrada' : 'Cotización'}</strong>
                  <div>{trip.packageName || SERVICE_TYPE_LABELS[getServiceType(trip)]} · {getBookingRoute(trip)}</div>
                  <div>Viaje: {formatDisplayDate(trip.travelDate)} · Registro: {formatDisplayDate(trip.quoteDate || trip.purchaseDate)}</div>
                  {trip.recordType === 'purchase' && <div>Valor: {formatCurrency(trip.totalValue)}</div>}
                </div>
              )) : <p>No hay otros viajes registrados para esta cédula.</p>}
            </section>
            <p><strong>Tipo de viaje:</strong> {getServiceType(selectedPassenger) === 'HOTEL'
              ? 'Estadía'
              : (selectedPassenger.tripType ?? (selectedPassenger.returnDate ? 'ROUND_TRIP' : 'ONE_WAY')) === 'ROUND_TRIP' ? 'Ida y vuelta' : 'Solo ida'}</p>
            <p><strong>{getServiceType(selectedPassenger) === 'HOTEL' ? 'Fecha de ingreso:' : 'Fecha de ida:'}</strong> {formatDisplayDate(selectedPassenger.travelDate)}</p>
            {selectedPassenger.returnDate && <p><strong>{getServiceType(selectedPassenger) === 'HOTEL' ? 'Fecha de salida:' : 'Fecha de regreso:'}</strong> {formatDisplayDate(selectedPassenger.returnDate)}</p>}
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
            <p><strong>Ruta:</strong> {getBookingRoute(selectedPassenger)}</p>
            <p><strong>Código de Reserva:</strong> {selectedPassenger.bookingCode}</p>
            <p><strong>Aerolínea:</strong> {selectedPassenger.airline}</p>
            <p><strong>Método de Pago:</strong> {selectedPassenger.paymentMethod}</p>
            <p><strong>Valor Total:</strong> {formatCurrency(selectedPassenger.totalValue)}</p>
            <p><strong>Valor Abonado:</strong> {formatCurrency(selectedPassenger.paidAmount)}</p>
            <p><strong>Saldo Pendiente:</strong> {formatCurrency(Math.max(0, selectedPassenger.totalValue - selectedPassenger.paidAmount))}</p>
            <p><strong>Estado del Pago:</strong> {selectedPassenger.paymentStatus}</p>
            {selectedPassenger.paymentStatus === 'ABONADO' && selectedPassenger.paymentDueDate && (
              <p><strong>Fecha límite para completar el pago:</strong> {formatDisplayDate(selectedPassenger.paymentDueDate)}</p>
            )}
            <button 
              onClick={() => {
                setSelectedPassenger(null);
                setClientHistory([]);
              }}
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
          <div style={{ backgroundColor: '#fff', padding: 'clamp(16px, 4vw, 30px)', borderRadius: '16px', maxWidth: '900px', width: 'calc(100% - 24px)', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#2D60A8', marginTop: 0, borderBottom: '2px solid #E3B31D', paddingBottom: '10px' }}>
              {completingQuote ? 'Completar cotización y registrar compra' : editingQuote ? 'Editar datos de la cotización' : editingBookingId ? '✏️ Editar Cliente / Venta' : '➕ Registrar Cliente / Venta Manual'}
            </h3>
            {completingQuote && (
              <p style={{ margin: '12px 0 0', color: '#4b5563' }}>
                Completa los datos de la reserva, la aerolínea y el precio. Al guardar, la cotización pasará a Compras registradas.
              </p>
            )}
            
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              {!editingBookingId && !completingQuote && !editingQuote && (
                <div>
                  <label htmlFor="admin-record-type" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>¿Qué deseas registrar?</label>
                  <select
                    id="admin-record-type"
                    value={manualRecordType}
                    onChange={event => {
                      const recordType = event.target.value as 'QUOTE' | 'PURCHASE';
                      setManualRecordType(recordType);
                      setNewBooking(current => ({
                        ...current,
                        purchaseDate: recordType === 'PURCHASE' ? getLocalDateString() : ''
                      }));
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="QUOTE">Cotización para seguimiento</option>
                    <option value="PURCHASE">Compra realizada</option>
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="admin-client-source" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>¿De dónde llegó el cliente?</label>
                <select id="admin-client-source" value={newBooking.source}
                  required={!editingBookingId}
                  onChange={event => setNewBooking(current => ({ ...current, source: event.target.value as Booking['source'] }))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Selecciona un canal</option>
                  {Object.entries(CLIENT_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <small style={{ color: '#64748b' }}>Este dato identifica el origen comercial; no cambia si registras una cotización o una compra.</small>
              </div>
              {manualRecordType === 'PURCHASE' && !editingBookingId && !completingQuote && !editingQuote && (
                <div>
                  <label htmlFor="admin-purchase-date" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Fecha de compra:</label>
                  <input
                    id="admin-purchase-date"
                    required
                    type="date"
                    max={getLocalDateString()}
                    value={newBooking.purchaseDate}
                    onChange={event => setNewBooking(current => ({ ...current, purchaseDate: event.target.value }))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Nombres:</label>
                  <input required type="text" minLength={2} maxLength={60} pattern="[\p{L}][\p{L}\s'\-]{1,59}" title="Usa entre 2 y 60 letras; se permiten espacios, guiones y apóstrofos." placeholder="Ej: María José" value={newBooking.firstName} onChange={e => setNewBooking({...newBooking, firstName: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Apellidos:</label>
                  <input required type="text" minLength={2} maxLength={60} pattern="[\p{L}][\p{L}\s'\-]{1,59}" title="Usa entre 2 y 60 letras; se permiten espacios, guiones y apóstrofos." placeholder="Ej: Pérez Gómez" value={newBooking.lastName} onChange={e => setNewBooking({...newBooking, lastName: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
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
                  <input required type="text" inputMode={newBooking.documentType === 'Pasaporte' ? 'text' : 'numeric'} minLength={newBooking.documentType === 'Pasaporte' ? 6 : 5} maxLength={15} pattern={newBooking.documentType === 'Pasaporte' ? '[A-Za-z0-9]{6,15}' : '[0-9]{5,15}'} title={newBooking.documentType === 'Pasaporte' ? 'El pasaporte debe tener entre 6 y 15 letras o números.' : 'El documento debe tener entre 5 y 15 dígitos.'} value={newBooking.cedula} onBlur={() => void handleClientDocumentBlur()} onChange={e => setNewBooking({...newBooking, cedula: normalizeDocumentNumber(e.target.value, newBooking.documentType)})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
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
                  value={newBooking.serviceType}
                  onChange={e => {
                    const serviceType = e.target.value as ServiceType;
                    setNewBooking(current => ({
                      ...current,
                      serviceType,
                      isTicket: serviceType === 'TIQUETE' || serviceType === 'TIQUETE_HOTEL',
                      isPackage: serviceType === 'PAQUETES',
                      packageType: serviceType === 'PAQUETES' ? current.packageType : '',
                      packageName: serviceType === 'PAQUETES' ? current.packageName : '',
                      tripType: serviceType === 'HOTEL' ? 'ROUND_TRIP' : current.tripType,
                      hasDifferentReturnRoute: serviceType === 'HOTEL' ? false : current.hasDifferentReturnRoute
                    }));
                    if (serviceType === 'HOTEL') setOrigin('');
                    if (serviceType !== 'PAQUETES' && newBooking.serviceType === 'PAQUETES') setDestination('');
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="TIQUETE">Tiquete</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="TIQUETE_HOTEL">Tiquete y Hotel</option>
                  <option value="PAQUETES">Paquetes</option>
                </select>
              </div>

              {newBooking.isPackage && (
                <div>
                  <label htmlFor="admin-package-selection" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>Paquete de interés:</label>
                  <select
                    id="admin-package-selection"
                    required
                    value={selectedAdminPackageValue}
                    onChange={event => {
                      const separatorIndex = event.target.value.indexOf('::');
                      if (separatorIndex < 0) {
                        setNewBooking(current => ({ ...current, packageType: '', packageName: '' }));
                        setDestination('');
                        return;
                      }

                      const packageType = event.target.value.slice(0, separatorIndex) as PackageType;
                      const packageName = event.target.value.slice(separatorIndex + 2);
                      const selectedPackage = adminPackageCategories
                        .find(category => category.id === packageType)
                        ?.packages.find(travelPackage => travelPackage.title === packageName);
                      setNewBooking(current => ({ ...current, packageType, packageName }));
                      setDestination(selectedPackage?.formDestination ?? '');
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">Selecciona un paquete</option>
                    {adminPackageCategories.map(category => (
                      <optgroup key={category.id} label={category.title}>
                        {category.packages.map(travelPackage => (
                          <option key={`${category.id}-${travelPackage.title}`} value={`${category.id}::${travelPackage.title}`}>
                            {travelPackage.destination} — {travelPackage.title}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {isHistoricalPackage && (
                      <optgroup label="Paquetes históricos (solo edición)">
                        <option value={selectedAdminPackageValue}>
                          {getPackageTypeLabel(newBooking.packageType)} · {newBooking.packageName}
                        </option>
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              {/* Origen */}
              {newBooking.serviceType !== 'HOTEL' && (
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <LocationSelector labelPrefix="Origen" value={origin} onChange={setOrigin} />
                </div>
              )}

              {/* Destino */}
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <LocationSelector labelPrefix="Destino" value={destination} onChange={setDestination} />
              </div>

              {newBooking.serviceType !== 'HOTEL' && newBooking.tripType === 'ROUND_TRIP' && (
                <ReturnRouteSelector
                  enabled={newBooking.hasDifferentReturnRoute}
                  returnOrigin={returnOrigin}
                  returnDestination={returnDestination}
                  onEnabledChange={enabled => {
                    setNewBooking(current => ({ ...current, hasDifferentReturnRoute: enabled }));
                    if (enabled) {
                      setReturnOrigin(current => current || destination);
                      setReturnDestination(current => current || origin);
                    }
                  }}
                  onReturnOriginChange={setReturnOrigin}
                  onReturnDestinationChange={setReturnDestination}
                />
              )}

              {!editingQuote && <div style={{ display: 'grid', gridTemplateColumns: newBooking.serviceType === 'HOTEL' ? '1fr' : '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Código Reserva:</label>
                  <input required={completingQuote} type="text" maxLength={30} placeholder="Ej: 26940704" value={newBooking.bookingCode} onChange={e => setNewBooking({...newBooking, bookingCode: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                {newBooking.serviceType !== 'HOTEL' && <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Aerolínea:</label>
                  <input required={completingQuote} type="text" maxLength={80} placeholder="Ej: Avianca, JetSmart" value={newBooking.airline} onChange={e => setNewBooking({...newBooking, airline: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>}
              </div>}

              {newBooking.serviceType !== 'HOTEL' && <div>
                <label htmlFor="admin-trip-type" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Tipo de viaje:</label>
                <select
                  id="admin-trip-type"
                  value={newBooking.tripType}
                  onChange={e => {
                    const tripType = e.target.value as 'ONE_WAY' | 'ROUND_TRIP';
                    setNewBooking(current => ({
                      ...current,
                      tripType,
                      returnDate: tripType === 'ONE_WAY' ? '' : current.returnDate,
                      hasDifferentReturnRoute: tripType === 'ONE_WAY' ? false : current.hasDifferentReturnRoute
                    }));
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="ROUND_TRIP">Ida y vuelta</option>
                  <option value="ONE_WAY">Solo ida</option>
                </select>
              </div>}

              <div style={{ display: 'grid', gridTemplateColumns: (newBooking.serviceType === 'HOTEL' || newBooking.tripType === 'ROUND_TRIP') ? '1fr 1fr' : '1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>{newBooking.serviceType === 'HOTEL' ? 'Fecha de ingreso:' : 'Fecha Viaje:'}</label>
                  <input required type="date" min={!editingBookingId ? getLocalDateString() : undefined} value={newBooking.travelDate} onChange={e => setNewBooking({...newBooking, travelDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                {(newBooking.serviceType === 'HOTEL' || newBooking.tripType === 'ROUND_TRIP') && <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>{newBooking.serviceType === 'HOTEL' ? 'Fecha de salida:' : 'Fecha Regreso:'}</label>
                  <input required type="date" min={newBooking.travelDate || (!editingBookingId ? getLocalDateString() : undefined)} value={newBooking.returnDate} onChange={e => setNewBooking({...newBooking, returnDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>}
              </div>

              {!editingQuote && newBooking.serviceType !== 'HOTEL' && <div>
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
                  <label htmlFor="admin-commission-amount" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    Comisión cobrada al cliente (COP){completingQuote ? ' *' : ''}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff' }}>
                    <span style={{ paddingLeft: '8px', color: '#374151', fontWeight: 'bold' }}>$</span>
                    <input id="admin-commission-amount" type="text" inputMode="numeric" maxLength={13}
                      required={completingQuote}
                      value={formatAmountInput(newBooking.commissionAmount)}
                      onChange={e => setNewBooking(current => ({ ...current, commissionAmount: parseAmountInput(e.target.value) }))}
                      placeholder="Escribe la comisión"
                      style={{ width: '100%', padding: '8px', border: 'none', outline: 'none' }}
                    />
                  </div>
                  <small style={{ color: '#64748b' }}>Valor variable para esta venta. No se suma automáticamente al valor total.</small>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Estado del Pago:</label>
                  <select required disabled={addingPayment} value={newBooking.paymentStatus} onChange={e => {
                    const paymentStatus = e.target.value;
                    setNewBooking({
                      ...newBooking,
                      paymentStatus,
                      paidAmount: paymentStatus === 'PAGADO' ? formTotalValue : paymentStatus === 'PENDIENTE' ? 0 : newBooking.paidAmount,
                      paymentDueDate: paymentStatus === 'ABONADO' ? newBooking.paymentDueDate : ''
                    });
                  }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    {editedPurchaseAmount <= 0 && <option value="PENDIENTE">PENDIENTE</option>}
                    <option value="ABONADO">ABONADO</option>
                    {(!editingBookingId || completingQuote || activeView === 'purchases') && <option value="PAGADO">PAGADO</option>}
                  </select>
                </div>
              </div>}

              {!editingQuote && newBooking.paymentStatus === 'ABONADO' && (
                <div style={{ padding: '12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    {addingPayment ? 'Nuevo abono (COP):' : editedPurchaseAmount > 0 ? 'Valor abonado acumulado (COP):' : 'Cantidad abonada (COP):'}
                  </label>
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
                        const maxAmount = addingPayment
                          ? Math.max(0, formTotalValue - editedPurchaseAmount)
                          : formTotalValue;
                        const paidAmount = parsedAmount === '' ? '' : Math.min(maxAmount, parsedAmount);
                        setNewBooking({ ...newBooking, paidAmount });
                      }}
                      style={{ width: '100%', padding: '8px', border: 'none', outline: 'none' }}
                    />
                  </div>
                  {addingPayment && (
                    <p style={{ margin: '8px 0 0', color: '#4b5563', fontSize: '0.85rem' }}>
                      Abonado antes: {formatCurrency(editedPurchaseAmount)}
                    </p>
                  )}
                  <div style={{ marginTop: '12px' }}>
                    <label htmlFor="admin-payment-due-date" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Fecha límite para completar el pago:</label>
                    <input
                      id="admin-payment-due-date"
                      type="date"
                      required={!addingPayment || editedPurchaseAmount + formPaidAmount < formTotalValue}
                      value={newBooking.paymentDueDate}
                      onChange={e => setNewBooking({ ...newBooking, paymentDueDate: e.target.value })}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: 'bold' }}>
                    <span>Abonado acumulado: {formatCurrency(addingPayment ? editedPurchaseAmount + formPaidAmount : formPaidAmount)}</span>
                    <span style={{ color: '#dc2626' }}>Falta: {formatCurrency(Math.max(0, formTotalValue - (addingPayment ? editedPurchaseAmount + formPaidAmount : formPaidAmount)))}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#E3B31D',
                    color: '#2D60A8',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  {isSaving ? 'Guardando...' : completingQuote ? 'Registrar compra y mover a Compras' : addingPayment ? 'Registrar abono' : editingBookingId ? 'Guardar Cambios' : 'Guardar Venta'}
                </button>
                <button type="button" onClick={() => void closeEditingModal()} style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
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