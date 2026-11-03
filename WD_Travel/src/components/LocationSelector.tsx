import React, { useEffect, useId, useRef, useState } from 'react';
import { COUNTRIES_AND_CITIES } from '../data/locations';

interface LocationSelectorProps {
  labelPrefix: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const getSuggestions = (options: string[], query: string) => {
  const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  return options
    .filter(option => option.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').includes(normalizedQuery))
    .slice(0, 8);
};

export const LocationSelector: React.FC<LocationSelectorProps> = ({ labelPrefix, value, onChange, required = true }) => {
  const [selectedCountry, selectedCity = ''] = value.split(' - ');
  const selectedCountryObj = COUNTRIES_AND_CITIES.find(country => country.country === selectedCountry);
  const id = useId();
  const countryListId = `${id}-countries`;
  const cityListId = `${id}-cities`;
  const [countrySearch, setCountrySearch] = useState(selectedCountry);
  const [citySearch, setCitySearch] = useState(selectedCity);
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [activeCountryIndex, setActiveCountryIndex] = useState(-1);
  const [activeCityIndex, setActiveCityIndex] = useState(-1);
  const lastChangeValue = useRef(value);
  const countrySuggestions = getSuggestions(COUNTRIES_AND_CITIES.map(country => country.country), countrySearch);
  const citySuggestions = getSuggestions(selectedCountryObj?.cities ?? [], citySearch);

  useEffect(() => {
    if (value === lastChangeValue.current) return;
    lastChangeValue.current = value;
    setCountrySearch(selectedCountry);
    setCitySearch(selectedCity);
  }, [value, selectedCountry, selectedCity]);

  const handleCountryChange = (country: string) => {
    setCountrySearch(country);
    setCitySearch('');
    setActiveCountryIndex(-1);
    setActiveCityIndex(-1);
    setCityOpen(false);
    const nextValue = COUNTRIES_AND_CITIES.some(item => item.country === country) ? `${country} - ` : '';
    lastChangeValue.current = nextValue;
    onChange(nextValue);
  };

  const handleCityChange = (city: string) => {
    setCitySearch(city);
    setActiveCityIndex(-1);
    const nextValue = selectedCountry
      ? `${selectedCountry} - ${selectedCountryObj?.cities.includes(city) ? city : ''}`
      : '';
    lastChangeValue.current = nextValue;
    onChange(nextValue);
  };

  const handleCountryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setCountryOpen(false);
    } else if (event.key === 'ArrowDown' && countrySuggestions.length > 0) {
      event.preventDefault();
      setCountryOpen(true);
      setActiveCountryIndex(index => Math.min(index + 1, countrySuggestions.length - 1));
    } else if (event.key === 'ArrowUp' && countrySuggestions.length > 0) {
      event.preventDefault();
      setActiveCountryIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && countryOpen && countrySuggestions.length > 0) {
      event.preventDefault();
      handleCountryChange(countrySuggestions[activeCountryIndex] ?? countrySuggestions[0]);
      setCountryOpen(false);
    }
  };

  const handleCityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setCityOpen(false);
    } else if (event.key === 'ArrowDown' && citySuggestions.length > 0) {
      event.preventDefault();
      setCityOpen(true);
      setActiveCityIndex(index => Math.min(index + 1, citySuggestions.length - 1));
    } else if (event.key === 'ArrowUp' && citySuggestions.length > 0) {
      event.preventDefault();
      setActiveCityIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && cityOpen && citySuggestions.length > 0) {
      event.preventDefault();
      handleCityChange(citySuggestions[activeCityIndex] ?? citySuggestions[0]);
      setCityOpen(false);
    }
  };

  return (
    <div className="location-selector-grid">
      <div className="location-selector-field">
        <label htmlFor={`${id}-country`} style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
          País de {labelPrefix}:
        </label>
        <input
          id={`${id}-country`}
          type="text"
          required={required}
          autoComplete="off"
          placeholder="Buscar país..."
          value={countrySearch}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={countryOpen && countrySuggestions.length > 0}
          aria-controls={countryListId}
          aria-activedescendant={activeCountryIndex >= 0 ? `${countryListId}-${activeCountryIndex}` : undefined}
          onFocus={() => setCountryOpen(true)}
          onBlur={() => setCountryOpen(false)}
          onChange={event => {
            handleCountryChange(event.target.value);
            setCountryOpen(true);
          }}
          onKeyDown={handleCountryKeyDown}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
        />
        {countryOpen && (
          <div id={countryListId} className="location-suggestions" role="listbox" aria-label={`País de ${labelPrefix}`}>
            {countrySuggestions.length > 0 ? countrySuggestions.map((country, index) => (
              <div
                id={`${countryListId}-${index}`}
                key={country}
                role="option"
                aria-selected={index === activeCountryIndex}
                className="location-suggestion"
                onPointerDown={event => {
                  event.preventDefault();
                  handleCountryChange(country);
                  setCountryOpen(false);
                }}
              >
                {country}
              </div>
            )) : <div className="location-suggestion-empty">No se encontraron países.</div>}
          </div>
        )}
      </div>

      <div className="location-selector-field">
        <label htmlFor={`${id}-city`} style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}>
          Ciudad / Aeropuerto {labelPrefix}:
        </label>
        <input
          id={`${id}-city`}
          type="text"
          required={required}
          disabled={!selectedCountry}
          autoComplete="off"
          placeholder={selectedCountry ? 'Buscar ciudad o aeropuerto...' : 'Primero selecciona País'}
          value={citySearch}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={cityOpen && citySuggestions.length > 0}
          aria-controls={cityListId}
          aria-activedescendant={activeCityIndex >= 0 ? `${cityListId}-${activeCityIndex}` : undefined}
          onFocus={() => setCityOpen(true)}
          onBlur={() => setCityOpen(false)}
          onChange={event => {
            handleCityChange(event.target.value);
            setCityOpen(true);
          }}
          onKeyDown={handleCityKeyDown}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            backgroundColor: selectedCountry ? '#fff' : '#f3f4f6',
            cursor: selectedCountry ? 'pointer' : 'not-allowed'
          }}
        />
        {cityOpen && selectedCountry && (
          <div id={cityListId} className="location-suggestions" role="listbox" aria-label={`Ciudad o aeropuerto de ${labelPrefix}`}>
            {citySuggestions.length > 0 ? citySuggestions.map((city, index) => (
              <div
                id={`${cityListId}-${index}`}
                key={city}
                role="option"
                aria-selected={index === activeCityIndex}
                className="location-suggestion"
                onPointerDown={event => {
                  event.preventDefault();
                  handleCityChange(city);
                  setCityOpen(false);
                }}
              >
                {city}
              </div>
            )) : <div className="location-suggestion-empty">No se encontraron ciudades.</div>}
          </div>
        )}
      </div>
    </div>
  );
};
