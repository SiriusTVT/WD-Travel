import React, { useEffect, useId, useRef, useState } from 'react';
import { COUNTRIES_AND_CITIES } from '../data/locations';

interface LocationSelectorProps {
  labelPrefix: string; // "Origen" o "Destino"
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ labelPrefix, value, onChange, required = true }) => {
  const [selectedCountry, selectedCity = ''] = value.split(' - ');
  const selectedCountryObj = COUNTRIES_AND_CITIES.find(c => c.country === selectedCountry);
  const id = useId();
  const countryListId = `${id}-countries`;
  const cityListId = `${id}-cities`;
  const [countrySearch, setCountrySearch] = useState(selectedCountry);
  const [citySearch, setCitySearch] = useState(selectedCity);
  const lastChangeValue = useRef(value);

  useEffect(() => {
    if (value === lastChangeValue.current) return;
    lastChangeValue.current = value;
    setCountrySearch(selectedCountry);
    setCitySearch(selectedCity);
  }, [value, selectedCountry, selectedCity]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const country = e.target.value;
    setCountrySearch(country);
    setCitySearch('');
    const nextValue = COUNTRIES_AND_CITIES.some(item => item.country === country) ? `${country} - ` : '';
    lastChangeValue.current = nextValue;
    onChange(nextValue);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const city = e.target.value;
    setCitySearch(city);
    const nextValue = selectedCountry
      ? `${selectedCountry} - ${selectedCountryObj?.cities.includes(city) ? city : ''}`
      : '';
    lastChangeValue.current = nextValue;
    onChange(nextValue);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <div>
        <label htmlFor={`${id}-country`} style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
          País de {labelPrefix}:
        </label>
        <input
          id={`${id}-country`}
          type="search"
          list={countryListId}
          required={required}
          autoComplete="off"
          placeholder="Buscar país..."
          value={countrySearch}
          onChange={handleCountryChange}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
        />
        <datalist id={countryListId}>
          {COUNTRIES_AND_CITIES.map((item) => (
            <option key={item.country} value={item.country} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor={`${id}-city`} style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
          Ciudad / Aeropuerto {labelPrefix}:
        </label>
        <input
          id={`${id}-city`}
          type="search"
          list={cityListId}
          required={required}
          disabled={!selectedCountry}
          autoComplete="off"
          placeholder={selectedCountry ? 'Buscar ciudad o aeropuerto...' : 'Primero selecciona País'}
          value={citySearch}
          onChange={handleCityChange}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            backgroundColor: selectedCountry ? '#fff' : '#f3f4f6',
            cursor: selectedCountry ? 'pointer' : 'not-allowed'
          }}
        />
        <datalist id={cityListId}>
          {selectedCountryObj?.cities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </div>
    </div>
  );
};