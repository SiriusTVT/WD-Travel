export interface CountryLocation {
  country: string;
  cities: string[];
}

export const COUNTRIES_AND_CITIES: CountryLocation[] = [
  {
    country: "Colombia",
    cities: [
      "Cali (CLO)",
      "Bogotá (BOG)",
      "Medellín (MDE)",
      "Cartagena (CTG)",
      "Santa Marta (SMR)",
      "San Andrés (ADZ)",
      "Barranquilla (BAQ)",
      "Pereira (PEI)",
      "Bucaramanga (BGA)"
    ]
  },
  {
    country: "España",
    cities: [
      "Madrid (MAD)",
      "Barcelona (BCN)",
      "Valencia (VLC)",
      "Sevilla (SVQ)",
      "Gran Canaria (LPA)",
      "Málaga (AGP)"
    ]
  },
  {
    country: "Estados Unidos",
    cities: [
      "Miami (MIA)",
      "Orlando (MCO)",
      "Nueva York (JFK)",
      "Los Ángeles (LAX)",
      "Houston (IAH)",
      "Atlanta (ATL)"
    ]
  },
  {
    country: "México",
    cities: [
      "Cancún (CUN)",
      "Ciudad de México (MEX)",
      "Guadalajara (GDL)",
      "Monterrey (MTY)",
      "Playa del Carmen"
    ]
  },
  {
    country: "República Dominicana",
    cities: [
      "Punta Cana (PUJ)",
      "Santo Domingo (SDQ)"
    ]
  },
  {
    country: "Perú",
    cities: [
      "Lima (LIM)",
      "Cusco (CUZ)",
      "Arequipa (AQP)"
    ]
  },
  {
    country: "Argentina",
    cities: [
      "Buenos Aires (EZE)",
      "Mendoza (MDZ)",
      "Bariloche (BRC)"
    ]
  },
  {
    country: "Panamá",
    cities: [
      "Ciudad de Panamá (PTY)"
    ]
  },
  {
    country: "Brasil",
    cities: [
      "Río de Janeiro (GIG)",
      "São Paulo (GRU)"
    ]
  }
];