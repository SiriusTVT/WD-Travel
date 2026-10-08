import { COUNTRIES_AND_CITIES } from './data/locations';

export const MAX_TRAVELERS = 20;
export const MAX_CHILD_AGE = 17;
export const MAX_BOOKING_AMOUNT = 1_000_000_000;

export const isValidPersonName = (value: string) =>
  /^[\p{L}][\p{L}\s'-]{1,59}$/u.test(value.trim());

export const normalizeDocumentNumber = (value: string, documentType: string) =>
  documentType === 'Pasaporte'
    ? value.replace(/[^a-z\d]/gi, '').toUpperCase().slice(0, 15)
    : value.replace(/\D/g, '').slice(0, 15);

export const isValidDocumentNumber = (value: string, documentType: string) =>
  documentType === 'Pasaporte'
    ? /^[A-Z\d]{6,15}$/i.test(value)
    : /^\d{5,15}$/.test(value);

export const normalizePhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('57') && digits.length === 12 ? digits.slice(2) : digits;
};

export const isValidColombianPhone = (value: string) => /^3\d{9}$/.test(normalizePhoneNumber(value));

export const isValidContactPhone = (value: string, countryCode: string) => {
  const digits = value.replace(/\D/g, '');
  return countryCode === '+57'
    ? /^3\d{9}$/.test(digits)
    : /^\d{7,15}$/.test(digits);
};

export const isValidLocation = (value: string) => {
  const [country, city, ...extra] = value.split(' - ');
  return extra.length === 0 && Boolean(
    COUNTRIES_AND_CITIES.find(item => item.country === country)?.cities.includes(city)
  );
};

export const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10));
};

export const getLocalDateString = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};
