import React, { useEffect, useId, useRef, useState } from 'react';
import { CALLING_CODES } from '../data/callingCodes';

interface CallingCodeSelectorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

const getCallingCodeLabel = (code: string) => {
  const callingCode = CALLING_CODES.find(item => item.code === code);
  return callingCode ? `${callingCode.country} (${callingCode.code})` : '';
};

export const CallingCodeSelector: React.FC<CallingCodeSelectorProps> = ({ id, value, onChange }) => {
  const listId = `${useId()}-calling-codes`;
  const [search, setSearch] = useState(() => getCallingCodeLabel(value));
  const lastChangeValue = useRef(value);

  useEffect(() => {
    if (value === lastChangeValue.current) return;
    lastChangeValue.current = value;
    setSearch(getCallingCodeLabel(value));
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const label = event.target.value;
    const match = CALLING_CODES.find(item => `${item.country} (${item.code})` === label);
    setSearch(label);
    lastChangeValue.current = match?.code ?? '';
    onChange(match?.code ?? '');
  };

  return (
    <>
      <input
        id={id}
        type="search"
        list={listId}
        required
        autoComplete="off"
        aria-label="Número indicativo"
        placeholder="Buscar país o indicativo..."
        value={search}
        onChange={handleChange}
        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
      />
      <datalist id={listId}>
        {CALLING_CODES.map(item => (
          <option key={item.country} value={`${item.country} (${item.code})`} />
        ))}
      </datalist>
    </>
  );
};
