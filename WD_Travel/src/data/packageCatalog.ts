import type { PackageType } from './packageTypes';

export interface TravelPackage {
  destination: string;
  badge: string;
  title: string;
  price?: string;
  priceLabel?: string;
  details: string;
  description: string;
  includes: string[];
  formDestination?: string;
  actionText?: string;
  availableUntil?: string;
  image: string;
  imageCredit?: {
    label: string;
    url: string;
  };
}

export interface PackageCategory {
  id: PackageType;
  title: string;
  description: string;
  packages: TravelPackage[];
}

const allPackageCategories: PackageCategory[] = [
  {
    id: 'paquetes-migratorios',
    title: 'Paquete migratorio',
    description: 'Acompañamiento para preparar tu viaje y dar el siguiente paso en España.',
    packages: [
      {
        destination: 'España',
        badge: 'Acompañamiento 24/7',
        title: 'Paquete migratorio a España',
        price: '$3.200.000 COP',
        priceLabel: 'Desde',
        details: '10 días y 9 noches',
        description: 'Viaja con los servicios esenciales organizados y apoyo antes y durante tu experiencia.',
        includes: [
          'Tiquetes aéreos',
          'Seguro de viaje',
          'E-SIM con 90 GB',
          'Reserva de hotel por 10 días y 9 noches',
          'Acompañamiento 24/7'
        ],
        formDestination: 'España - Madrid (MAD)',
        image: '/packages/madrid.jpg',
        imageCredit: { label: 'Unsplash · licencia Unsplash', url: 'https://unsplash.com/license' }
      }
    ]
  },
  {
    id: 'paquetes-hotel-vuelos',
    title: 'Paquetes de hotel y vuelos',
    description: 'Ofertas con hotel y vuelo. Tarifas por persona en acomodación doble; reserva antes del 8 de noviembre de 2026.',
    packages: [
      {
        destination: 'Puerto Plata · saliendo de Bogotá',
        badge: 'Hotel + vuelo',
        title: 'Viva Heavens by Wyndham',
        price: '$1.921.776 COP',
        priceLabel: 'Desde',
        details: 'Paquete a Puerto Plata',
        description: 'Tarifa PPN en acomodación doble. Reserva antes del 8 de noviembre de 2026.',
        includes: ['Hotel: Viva Heavens by Wyndham', 'Vuelo desde Bogotá'],
        formDestination: 'República Dominicana - Puerto Plata (POP)',
        availableUntil: '2026-11-08',
        image: '/packages/puerto-plata.jpg',
        imageCredit: { label: 'Scotia · CC BY 3.0 · redimensionada', url: 'https://commons.wikimedia.org/wiki/File:A_shady_nook_on_Playa_Dorada_beach_-_panoramio.jpg' }
      },
      {
        destination: 'Ciudad de México · saliendo de Cali',
        badge: 'Hotel + vuelo',
        title: 'Presidente InterContinental Mexico City by IHG',
        price: '$880.963 COP',
        priceLabel: 'Desde',
        details: 'Paquete a Ciudad de México',
        description: 'Tarifa PPN en acomodación doble. Reserva antes del 8 de noviembre de 2026.',
        includes: ['Hotel: Presidente InterContinental Mexico City by IHG', 'Vuelo desde Cali'],
        formDestination: 'México - Ciudad de México (MEX)',
        availableUntil: '2026-11-08',
        image: '/packages/ciudad-de-mexico.jpg',
        imageCredit: { label: 'Drkgk · CC0 · redimensionada', url: 'https://commons.wikimedia.org/wiki/File:Patio_Central_en_Palacio_Nacional_Mexico_2019.jpg' }
      },
      {
        destination: 'Río de Janeiro · saliendo de Bogotá',
        badge: 'Hotel + vuelo',
        title: 'Sheraton Grand Rio Hotel & Resort',
        price: '$1.227.671 COP',
        priceLabel: 'Desde',
        details: 'Paquete a Río de Janeiro',
        description: 'Tarifa PPN en acomodación doble. Reserva antes del 8 de noviembre de 2026.',
        includes: ['Hotel: Sheraton Grand Rio Hotel & Resort', 'Vuelo desde Bogotá'],
        formDestination: 'Brasil - Río de Janeiro (GIG)',
        availableUntil: '2026-11-08',
        image: '/packages/rio-de-janeiro.jpg',
        imageCredit: { label: 'Wilfredor · CC0 · redimensionada', url: 'https://commons.wikimedia.org/wiki/File:Copacabana,_Rio_de_Janeiro.jpg' }
      }
    ]
  },
  {
    id: 'paquetes-laborales',
    title: 'Paquetes con oferta laboral',
    description: 'Conoce requisitos, condiciones de trabajo y beneficios de cada vacante.',
    packages: [
      {
        destination: 'Montenegro · Podgorica, Tivat y Budva',
        badge: 'Contratación inmediata',
        title: 'Personal de hotel',
        details: 'Experiencia mínima de 1 año en hotelería',
        description: 'Vacantes para trabajar en hotelería en Montenegro.',
        includes: [
          'Salario: 5–7 € netos por hora',
          'Jornada: 40 horas semanales + horas extra pagadas',
          '2 comidas al día + 70 € mensuales para alimentación',
          'Alojamiento compartido incluido',
          'Transporte incluido',
          'Contrato de 12 meses, prorrogable',
          'Beneficios: posibilidad de aumento salarial, crecimiento en la empresa y tarjeta de residencia en 1 mes'
        ],
        formDestination: 'Montenegro - Podgorica (TGD)',
        actionText: 'Consultar esta oferta',
        image: '/packages/budva.jpg',
        imageCredit: { label: 'Сергей Наруков · CC BY 3.0 · redimensionada', url: 'https://commons.wikimedia.org/wiki/File:Old_Town,_Budva,_Montenegro_-_panoramio_(37).jpg' }
      },
      {
        destination: 'Croacia',
        badge: 'Ingreso inmediato',
        title: '4 vacantes para electricistas',
        details: 'Se requiere experiencia comprobada',
        description: 'Oferta laboral para electricistas en Croacia.',
        includes: [
          'Salario: 7–9 € por hora',
          'Jornada: 10–12 horas diarias',
          '6 días a la semana',
          'Alojamiento gratuito',
          'Ropa de trabajo gratuita'
        ],
        formDestination: 'Croacia - Dubrovnik (DBV)',
        actionText: 'Consultar esta oferta',
        image: '/packages/dubrovnik.jpg',
        imageCredit: { label: 'Diego Delso · CC BY-SA 3.0 · redimensionada', url: 'https://commons.wikimedia.org/wiki/File:Casco_viejo_de_Dubrovnik,_Croacia,_2014-04-14,_DD_07.JPG' }
      },
      {
        destination: 'Croacia',
        badge: 'Vacantes disponibles',
        title: 'Albañiles y ayudantes de construcción',
        details: 'Salario según experiencia',
        description: 'Oferta laboral para trabajos de construcción en Croacia.',
        includes: [
          'Salario: 5–7 € por hora, según experiencia',
          'Jornada: 10–12 horas diarias',
          'Contrato de hasta 3 años',
          'Permiso laboral',
          'Alojamiento gratuito',
          'Ropa de trabajo gratis'
        ],
        formDestination: 'Croacia - Dubrovnik (DBV)',
        actionText: 'Consultar esta oferta',
        image: '/packages/dubrovnik.jpg',
        imageCredit: { label: 'Diego Delso · CC BY-SA 3.0 · redimensionada', url: 'https://commons.wikimedia.org/wiki/File:Casco_viejo_de_Dubrovnik,_Croacia,_2014-04-14,_DD_07.JPG' }
      },
      {
        destination: 'Montenegro · Podgorica',
        badge: 'Vacante',
        title: 'Barista',
        details: 'Experiencia comprobada',
        description: 'Vacante para barista en Podgorica, Montenegro.',
        includes: [
          'Salario: 800 € netos al mes',
          'Horario: 8 horas al día, 6 días a la semana',
          'Alojamiento incluido',
          '2 comidas al día'
        ],
        formDestination: 'Montenegro - Podgorica (TGD)',
        actionText: 'Consultar esta oferta',
        image: '/packages/podgorica.jpg',
        imageCredit: { label: 'Aleksandar Jaredić · CC BY-SA 3.0 · redimensionada', url: 'https://commons.wikimedia.org/wiki/File:Dva_mosta_panorama_sm.jpg' }
      },
      {
        destination: 'Montenegro · Podgorica',
        badge: 'Contratación inmediata',
        title: 'Personal de limpieza',
        details: 'Experiencia en limpieza profesional',
        description: 'Vacante para personal de limpieza en Podgorica, Montenegro.',
        includes: [
          'Salario: 700 € netos al mes',
          'Horario: 8 horas al día, 6 días a la semana',
          'Alojamiento incluido',
          'Comidas no incluidas',
          'Transporte incluido',
          'Contrato de 12 meses, prorrogable'
        ],
        formDestination: 'Montenegro - Podgorica (TGD)',
        actionText: 'Consultar esta oferta',
        image: '/packages/podgorica.jpg',
        imageCredit: { label: 'Aleksandar Jaredić · CC BY-SA 3.0 · redimensionada', url: 'https://commons.wikimedia.org/wiki/File:Dva_mosta_panorama_sm.jpg' }
      }
    ]
  },
  {
    id: 'asistencias-viaje',
    title: 'Asistencias de viaje',
    description: 'Soluciones para viajar con respaldo médico y conexión móvil en destino.',
    packages: [
      {
        destination: 'Asistencia médica',
        badge: 'Viaja con respaldo',
        title: 'Seguro médico de viaje',
        details: 'Cobertura según destino y duración del viaje',
        description: 'Asistencia médica internacional para acompañarte ante imprevistos de salud durante el viaje.',
        includes: [
          'Opciones para diferentes destinos y duraciones',
          'Consulta las coberturas y condiciones disponibles',
          'Asesoría para elegir la asistencia adecuada'
        ],
        actionText: 'Cotizar asistencia',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85'
      },
      {
        destination: 'Conectividad internacional',
        badge: 'eSIM',
        title: 'Internet móvil para tu viaje',
        details: 'Planes disponibles según país y duración',
        description: 'Mantente conectado en destino con una eSIM digital. Consulta compatibilidad, países y planes disponibles.',
        includes: [
          'Activación digital, sin tarjeta física',
          'Planes de datos según el destino',
          'El paquete migratorio a España incluye una eSIM con 90 GB'
        ],
        actionText: 'Cotizar asistencia',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85'
      }
    ]
  }
];

export const getAvailablePackageCategories = (today: string) =>
  allPackageCategories
    .map(category => ({
      ...category,
      packages: category.packages.filter(
        travelPackage => !travelPackage.availableUntil || today < travelPackage.availableUntil
      )
    }))
    .filter(category => category.packages.length > 0);
