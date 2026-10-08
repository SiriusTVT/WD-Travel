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
  adultCount?: number;
  childCount?: number;
  childAges?: number[];
  isTicket: boolean;
  isPackage: boolean;
  airline: string;
  paymentMethod: string;
  totalValue: number;
  paymentStatus: string;
  paidAmount: number;
  passengers: Passenger[];
}

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "1",
    quoteDate: "2026-09-20",
    purchaseDate: "2026-09-22",
    firstName: "NELLY",
    lastName: "AMAYA VIVEROS",
    passenger: "NELLY AMAYA VIVEROS",
    phone: "3134902197",
    cedula: "1098765432",
    route: "Colombia - Cali (CLO) ➔ Colombia - Cartagena (CTG) ➔ Colombia - Cali (CLO)",
    bookingCode: "26940704",
    travelDate: "2026-10-09",
    returnDate: "2026-10-13",
    isTicket: false,
    isPackage: true,
    airline: "JET SMART",
    paymentMethod: "TRANSFERENCIA",
    totalValue: 0,
    paymentStatus: "PENDIENTE",
    paidAmount: 0,
    passengers: [{ firstName: "NELLY", lastName: "AMAYA VIVEROS", name: "NELLY AMAYA VIVEROS", cedula: "1098765432" }]
  },
  {
    id: "2",
    quoteDate: "2026-09-19",
    purchaseDate: "2026-09-21",
    firstName: "JOSE RUY",
    lastName: "RAMOS PAZ",
    passenger: "JOSE RUY RAMOS PAZ",
    phone: "3004803093",
    cedula: "1112223334",
    route: "Colombia - Cali (CLO) ➔ España - Madrid (MAD) ➔ España - Gran Canaria (LPA)",
    bookingCode: "PENDIENTE",
    travelDate: "2026-11-01",
    returnDate: "2026-11-15",
    isTicket: true,
    isPackage: false,
    airline: "IBERIA",
    paymentMethod: "EFECTIVO",
    totalValue: 0,
    paymentStatus: "PENDIENTE",
    paidAmount: 0,
    passengers: [{ firstName: "JOSE RUY", lastName: "RAMOS PAZ", name: "JOSE RUY RAMOS PAZ", cedula: "1112223334" }]
  },
  {
    id: "demo-quote-1",
    quoteDate: "2026-10-03",
    purchaseDate: "",
    firstName: "Cliente",
    lastName: "Ejemplo Uno",
    passenger: "Cliente Ejemplo Uno",
    phone: "+57 3000000001",
    cedula: "DEMO-001",
    documentType: "Cédula de ciudadanía",
    route: "Colombia - Bogotá (BOG) ➔ México - Cancún (CUN)",
    bookingCode: "PENDIENTE",
    travelDate: "2026-12-10",
    returnDate: "2026-12-17",
    isTicket: true,
    isPackage: false,
    airline: "Por definir",
    paymentMethod: "PENDIENTE",
    totalValue: 0,
    paymentStatus: "PENDIENTE",
    paidAmount: 0,
    passengers: [{
      firstName: "Cliente",
      lastName: "Ejemplo Uno",
      name: "Cliente Ejemplo Uno",
      cedula: "DEMO-001",
      documentType: "Cédula de ciudadanía"
    }]
  },
  {
    id: "demo-quote-2",
    quoteDate: "2026-10-04",
    purchaseDate: "",
    firstName: "Cliente",
    lastName: "Ejemplo Dos",
    passenger: "Cliente Ejemplo Dos",
    phone: "+57 3000000002",
    cedula: "DEMO-002",
    documentType: "Cédula de ciudadanía",
    route: "Colombia - Medellín (MDE) ➔ República Dominicana - Punta Cana (PUJ)",
    bookingCode: "PENDIENTE",
    travelDate: "2027-01-15",
    returnDate: "2027-01-22",
    isTicket: false,
    isPackage: true,
    airline: "Por definir",
    paymentMethod: "PENDIENTE",
    totalValue: 0,
    paymentStatus: "PENDIENTE",
    paidAmount: 0,
    passengers: [{
      firstName: "Cliente",
      lastName: "Ejemplo Dos",
      name: "Cliente Ejemplo Dos",
      cedula: "DEMO-002",
      documentType: "Cédula de ciudadanía"
    }]
  }
];