import React from 'react';
import { LocationSelector } from './LocationSelector';

interface ReturnRouteSelectorProps {
  enabled: boolean;
  returnOrigin: string;
  returnDestination: string;
  onEnabledChange: (enabled: boolean) => void;
  onReturnOriginChange: (value: string) => void;
  onReturnDestinationChange: (value: string) => void;
}

export const ReturnRouteSelector: React.FC<ReturnRouteSelectorProps> = ({
  enabled,
  returnOrigin,
  returnDestination,
  onEnabledChange,
  onReturnOriginChange,
  onReturnDestinationChange
}) => (
  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={event => onEnabledChange(event.target.checked)}
      />
      El regreso sale de una ciudad diferente
    </label>
    {enabled && (
      <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
        <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <LocationSelector labelPrefix="Origen del regreso" value={returnOrigin} onChange={onReturnOriginChange} />
        </div>
        <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <LocationSelector labelPrefix="Destino del regreso" value={returnDestination} onChange={onReturnDestinationChange} />
        </div>
      </div>
    )}
  </div>
);
