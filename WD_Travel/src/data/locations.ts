import { GLOBAL_AIRPORTS } from './globalAirports';

export interface CountryLocation {
  country: string;
  cities: string[];
}

const CURATED_COUNTRIES_AND_CITIES: CountryLocation[] = [
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
      "Bucaramanga (BGA)",
      "Armenia (AXM)",
      "Manizales (MZL)",
      "Leticia (LET)"
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
      "Málaga (AGP)",
      "Alicante (ALC)",
      "Bilbao (BIO)",
      "Ibiza (IBZ)",
      "Tenerife (TFS)"
    ]
  },
  {
    country: "Polonia",
    cities: [
      "Varsovia (WAW)",
      "Cracovia (KRK)",
      "Gdansk (GDN)",
      "Wroclaw (WRO)",
      "Poznan (POZ)"
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
      "Atlanta (ATL)",
      "Chicago (ORD)",
      "San Francisco (SFO)",
      "Las Vegas (LAS)",
      "Boston (BOS)",
      "Washington D. C. (IAD)"
    ]
  },
  {
    country: "México",
    cities: [
      "Cancún (CUN)",
      "Ciudad de México (MEX)",
      "Guadalajara (GDL)",
      "Monterrey (MTY)",
      "Playa del Carmen",
      "Oaxaca (OAX)",
      "Los Cabos (SJD)",
      "Puerto Vallarta (PVR)"
    ]
  },
  {
    country: "República Dominicana",
    cities: [
      "Punta Cana (PUJ)",
      "Santo Domingo (SDQ)",
      "Puerto Plata (POP)"
    ]
  },
  {
    country: "Perú",
    cities: [
      "Lima (LIM)",
      "Cusco (CUZ)",
      "Arequipa (AQP)",
      "Iquitos (IQT)"
    ]
  },
  {
    country: "Argentina",
    cities: [
      "Buenos Aires (EZE)",
      "Mendoza (MDZ)",
      "Bariloche (BRC)",
      "Córdoba (COR)",
      "Salta (SLA)"
    ]
  },
  {
    country: "Chile",
    cities: [
      "Santiago (SCL)",
      "Calama (CJC)",
      "Puerto Montt (PMC)",
      "Punta Arenas (PUQ)",
      "Iquique (IQQ)",
      "Isla de Pascua (IPC)"
    ]
  },
  {
    country: "Panamá",
    cities: [
      "Ciudad de Panamá (PTY)",
      "David (DAV)"
    ]
  },
  {
    country: "Brasil",
    cities: [
      "Río de Janeiro (GIG)",
      "São Paulo (GRU)",
      "Brasilia (BSB)",
      "Salvador (SSA)",
      "Recife (REC)",
      "Foz de Iguazú (IGU)"
    ]
  },
  {
    country: "Francia",
    cities: [
      "París (CDG)",
      "Niza (NCE)",
      "Lyon (LYS)",
      "Marsella (MRS)",
      "Toulouse (TLS)",
      "Burdeos (BOD)"
    ]
  },
  {
    country: "Países Bajos (Holanda)",
    cities: [
      "Ámsterdam (AMS)",
      "Róterdam (RTM)",
      "Eindhoven (EIN)",
      "Maastricht (MST)"
    ]
  },
  {
    country: "Reino Unido",
    cities: [
      "Londres (LHR)",
      "Manchester (MAN)",
      "Edimburgo (EDI)",
      "Birmingham (BHX)",
      "Glasgow (GLA)"
    ]
  },
  {
    country: "Italia",
    cities: [
      "Roma (FCO)",
      "Milán (MXP)",
      "Venecia (VCE)",
      "Nápoles (NAP)",
      "Florencia (FLR)"
    ]
  },
  {
    country: "Alemania",
    cities: [
      "Berlín (BER)",
      "Fráncfort (FRA)",
      "Múnich (MUC)",
      "Hamburgo (HAM)",
      "Düsseldorf (DUS)"
    ]
  },
  {
    country: "Portugal",
    cities: [
      "Lisboa (LIS)",
      "Oporto (OPO)",
      "Faro (FAO)",
      "Funchal (FNC)"
    ]
  },
  {
    country: "Suiza",
    cities: [
      "Zúrich (ZRH)",
      "Ginebra (GVA)",
      "Basilea (BSL)"
    ]
  },
  {
    country: "Turquía",
    cities: [
      "Estambul (IST)",
      "Antalya (AYT)",
      "Esmirna (ADB)",
      "Ankara (ESB)"
    ]
  },
  {
    country: "Grecia",
    cities: [
      "Atenas (ATH)",
      "Santorini (JTR)",
      "Heraclión (HER)",
      "Salónica (SKG)"
    ]
  },
  {
    country: "Japón",
    cities: [
      "Tokio (NRT)",
      "Tokio-Haneda (HND)",
      "Osaka (KIX)",
      "Nagoya (NGO)",
      "Fukuoka (FUK)"
    ]
  },
  {
    country: "Corea del Sur",
    cities: [
      "Seúl (ICN)",
      "Busan (PUS)",
      "Jeju (CJU)"
    ]
  },
  {
    country: "Tailandia",
    cities: [
      "Bangkok (BKK)",
      "Phuket (HKT)",
      "Chiang Mai (CNX)",
      "Koh Samui (USM)"
    ]
  },
  {
    country: "Emiratos Árabes Unidos",
    cities: [
      "Dubái (DXB)",
      "Abu Dabi (AUH)"
    ]
  },
  {
    country: "Canadá",
    cities: [
      "Toronto (YYZ)",
      "Vancouver (YVR)",
      "Montreal (YUL)",
      "Calgary (YYC)"
    ]
  },
  {
    country: "Costa Rica",
    cities: [
      "San José (SJO)",
      "Liberia (LIR)"
    ]
  },
  {
    country: "Ecuador",
    cities: [
      "Quito (UIO)",
      "Guayaquil (GYE)",
      "Islas Galápagos (GPS)"
    ]
  },
  {
    country: "Bolivia",
    cities: [
      "La Paz (LPB)",
      "Santa Cruz de la Sierra (VVI)",
      "Cochabamba (CBB)"
    ]
  },
  {
    country: "Uruguay",
    cities: [
      "Montevideo (MVD)",
      "Punta del Este (PDP)"
    ]
  },
  {
    country: "Guatemala",
    cities: [
      "Ciudad de Guatemala (GUA)",
      "Flores (FRS)"
    ]
  },
  {
    country: "Cuba",
    cities: [
      "La Habana (HAV)",
      "Varadero (VRA)",
      "Holguín (HOG)"
    ]
  },
  {
    country: "Jamaica",
    cities: [
      "Montego Bay (MBJ)",
      "Kingston (KIN)"
    ]
  },
  {
    country: "Australia",
    cities: [
      "Sídney (SYD)",
      "Melbourne (MEL)",
      "Brisbane (BNE)",
      "Perth (PER)"
    ]
  }
];

const countryNames = new Intl.DisplayNames(['es'], { type: 'region' });
const airportCitiesByCountry = new Map<string, Set<string>>();

for (const [countryCode, city, iataCode] of GLOBAL_AIRPORTS) {
  const country = countryNames.of(countryCode) || countryCode;
  const cities = airportCitiesByCountry.get(country) ?? new Set<string>();
  cities.add(`${city} (${iataCode})`);
  airportCitiesByCountry.set(country, cities);
}

const locationsByCountry = new Map<string, Set<string>>();
const curatedCountryNames = new Set(CURATED_COUNTRIES_AND_CITIES.map(({ country }) => country));
for (const { country, cities } of CURATED_COUNTRIES_AND_CITIES) {
  locationsByCountry.set(country, new Set(cities));
}

for (const [country, cities] of airportCitiesByCountry) {
  const existingCities = locationsByCountry.get(country) ?? new Set<string>();
  for (const city of cities) existingCities.add(city);
  locationsByCountry.set(country, existingCities);
}

export const COUNTRIES_AND_CITIES: CountryLocation[] = [
  ...CURATED_COUNTRIES_AND_CITIES.map(({ country }) => ({
    country,
    cities: [...(locationsByCountry.get(country) ?? [])]
  })),
  ...[...airportCitiesByCountry.keys()]
    .filter(country => !curatedCountryNames.has(country))
    .sort((first, second) => first.localeCompare(second, 'es'))
    .map(country => ({
      country,
      cities: [...(locationsByCountry.get(country) ?? [])]
    }))
];