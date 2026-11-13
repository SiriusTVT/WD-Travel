import type { PackageType } from './packageTypes';

export type ServiceType = 'TIQUETE' | 'HOTEL' | 'TIQUETE_HOTEL' | 'PAQUETES';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  TIQUETE: 'Tiquete',
  HOTEL: 'Hotel',
  TIQUETE_HOTEL: 'Tiquete y Hotel',
  PAQUETES: 'Paquetes'
};

export interface Passenger {
  firstName?: string;
  lastName?: string;
  name: string;
  cedula: string;
  documentType?: string;
}

export interface PaymentRecord {
  amount: number;
  date: string;
  method: string;
}

export interface Booking {
  id: string;
  quoteDate?: string;
  quoteStatus?: 'PENDING' | 'SENT' | 'PURCHASED';
  originQuoteId?: string;
  source?: 'whatsapp' | 'instagram' | 'facebook' | 'website' | 'referral' | 'in_person' | 'other';
  sentAt?: string;
  advisorEmail?: string;
  purchaseDate: string;
  firstName?: string;
  lastName?: string;
  passenger: string;
  phone: string;
  cedula: string;
  documentType?: string;
  route: string;
  bookingCode: string;
  travelDate: string;
  returnDate: string;
  tripType?: 'ONE_WAY' | 'ROUND_TRIP';
  hasDifferentReturnRoute?: boolean;
  returnOrigin?: string;
  returnDestination?: string;
  adultCount?: number;
  childCount?: number;
  childAges?: number[];
  serviceType?: ServiceType;
  isTicket: boolean;
  isPackage: boolean;
  packageType?: PackageType;
  packageName?: string;
  airline: string;
  paymentMethod: string;
  totalValue: number;
  commissionAmount?: number;
  paymentStatus: string;
  paidAmount: number;
  paymentDueDate?: string;
  paymentHistory?: PaymentRecord[];
  passengers: Passenger[];
}

export const MOCK_BOOKINGS: Booking[] = [];