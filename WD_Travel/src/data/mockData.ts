import type { PackageType } from './packageTypes';

export interface Passenger {
  firstName?: string;
  lastName?: string;
  name: string;
  cedula: string;
  documentType?: string;
}

export interface Booking {
  id: string;
  quoteDate?: string;
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
  adultCount?: number;
  childCount?: number;
  childAges?: number[];
  isTicket: boolean;
  isPackage: boolean;
  packageType?: PackageType;
  packageName?: string;
  airline: string;
  paymentMethod: string;
  totalValue: number;
  paymentStatus: string;
  paidAmount: number;
  passengers: Passenger[];
}

export const MOCK_BOOKINGS: Booking[] = [];