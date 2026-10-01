import React, { useState } from 'react';
import { COUNTRIES_AND_CITIES } from '../data/locations';

interface LocationSelectorProps {
  labelPrefix: string; // "Origen" o "Destino"
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ labelPrefix, onChange, required = true }) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  const selectedCountryObj = COUNTRIES_AND_CITIES.find(c => c.country === selectedCountry);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);
    onChange(''); // Reiniciar la ciudad al cambiar el país
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    onChange(city ? `${selectedCountry} - ${city}` : '');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
          País de {labelPrefix}:
        </label>
        <select
          required={required}
          value={selectedCountry}
          onChange={handleCountryChange}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
        >
          <option value="">-- Seleccionar País --</option>
          {COUNTRIES_AND_CITIES.map((item) => (
            <option key={item.country} value={item.country}>
              {item.country}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
          Ciudad / Aeropuerto {labelPrefix}:
        </label>
        <select
          required={required}
          disabled={!selectedCountry}
          onChange={handleCityChange}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            backgroundColor: selectedCountry ? '#fff' : '#f3f4f6',
            cursor: selectedCountry ? 'pointer' : 'not-allowed'
          }}
        >
          <option value="">
            {selectedCountry ? `-- Seleccionar Ciudad --` : `Primero selecciona País`}
          </option>
          {selectedCountryObj?.cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};