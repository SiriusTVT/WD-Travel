export const PACKAGE_TYPES = [
  { value: 'paquetes-migratorios', label: 'Paquete migratorio' },
  { value: 'paquetes-hotel-vuelos', label: 'Paquetes de hotel y vuelos' },
  { value: 'paquetes-laborales', label: 'Paquetes con oferta laboral' },
  { value: 'asistencias-viaje', label: 'Asistencias de viaje' }
] as const;

export type PackageType = typeof PACKAGE_TYPES[number]['value'];

export const getPackageTypeLabel = (value?: string) =>
  PACKAGE_TYPES.find(packageType => packageType.value === value)?.label ?? '';
