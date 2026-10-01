export interface Booking {
  id: string;
  purchaseDate: string;
  passenger: string;
  phone: string;
  cedula: string;
  route: string;
  bookingCode: string;
  travelDate: string;
  returnDate: string;
  isTicket: boolean;
  isPackage: boolean;
  airline: string;
  paymentMethod: string;
}

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "1",
    purchaseDate: "2026-09-22",
    passenger: "NELLY AMAYA VIVEROS",
    phone: "3134902197",
    cedula: "1098765432",
    route: "CLO - CTG - CLO",
    bookingCode: "26940704",
    travelDate: "2026-10-09",
    returnDate: "2026-10-13",
    isTicket: false,
    isPackage: true,
    airline: "JET SMART",
    paymentMethod: "TRANSFERENCIA"
  },
  {
    id: "2",
    purchaseDate: "2026-09-21",
    passenger: "JOSE RUY RAMOS PAZ",
    phone: "3004803093",
    cedula: "1112223334",
    route: "CLO MAD GRAN CANARIA",
    bookingCode: "PENDIENTE",
    travelDate: "2026-11-01",
    returnDate: "2026-11-15",
    isTicket: true,
    isPackage: false,
    airline: "IBERIA",
    paymentMethod: "EFECTIVO"
  }
];