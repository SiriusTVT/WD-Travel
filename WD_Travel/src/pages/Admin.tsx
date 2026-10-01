import React, { useState } from 'react';
import { MOCK_BOOKINGS, type Booking } from '../data/mockData';
import { LocationSelector } from '../components/LocationSelector';

export const Admin: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [search, setSearch] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState<Booking | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  // Estados de ubicación
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  // Estado para Escalas
  const [hasLayover, setHasLayover] = useState<boolean>(false);
  const [layovers, setLayovers] = useState<string[]>(['']);

  const [newBooking, setNewBooking] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    passenger: '',
    phone: '',
    cedula: '',
    bookingCode: '',
    travelDate: '',
    returnDate: '',
    isTicket: false,
    isPackage: true,
    airline: '',
    paymentMethod: 'TRANSFERENCIA',
    totalValue: 0 as number | '',
    paymentStatus: 'PENDIENTE',
    paidAmount: 0 as number | ''
  });

  const resetForm = () => {
    setOrigin('');
    setDestination('');
    setHasLayover(false);
    setLayovers(['']);
    setNewBooking({
      purchaseDate: new Date().toISOString().split('T')[0],
      passenger: '',
      phone: '',
      cedula: '',
      bookingCode: '',
      travelDate: '',
      returnDate: '',
      isTicket: false,
      isPackage: true,
      airline: '',
      paymentMethod: 'TRANSFERENCIA',
      totalValue: 0 as number | '',
      paymentStatus: 'PENDIENTE',
      paidAmount: 0 as number | ''
    });
  };

  const handleEditClick = (booking: Booking) => {
    const routeParts = booking.route.split(' ➔ ');
    setOrigin(routeParts[0] || '');
    setDestination(routeParts[routeParts.length - 1] || '');
    setHasLayover(routeParts.length > 2);
    setLayovers(routeParts.length > 2 ? routeParts.slice(1, -1) : ['']);
    setNewBooking({
      purchaseDate: booking.purchaseDate,
      passenger: booking.passenger,
      phone: booking.phone,
      cedula: booking.cedula,
      bookingCode: booking.bookingCode,
      travelDate: booking.travelDate,
      returnDate: booking.returnDate,
      isTicket: booking.isTicket,
      isPackage: booking.isPackage,
      airline: booking.airline,
      paymentMethod: booking.paymentMethod,
      totalValue: booking.totalValue,
      paymentStatus: booking.paymentStatus,
      paidAmount: booking.paidAmount
    });
    setEditingBookingId(booking.id);
    setShowAddModal(true);
  };

  const handleDeleteClick = (booking: Booking) => {
    const shouldDelete = window.confirm(`¿Deseas eliminar el registro de ${booking.passenger}?`);
    if (!shouldDelete) return;

    setBookings(currentBookings => currentBookings.filter(currentBooking => currentBooking.id !== booking.id));
    setSelectedPassenger(currentPassenger => currentPassenger?.id === booking.id ? null : currentPassenger);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalRoute = [origin, ...(hasLayover ? layovers : []), destination].join(' ➔ ');
    const totalValue = Number(newBooking.totalValue);
      const bookingData = {
        ...newBooking,
        totalValue,
        paidAmount: newBooking.paymentStatus === 'PAGADO' ? totalValue : Math.min(Number(newBooking.paidAmount) || 0, totalValue)
      };

    if (editingBookingId) {
      setBookings(currentBookings => currentBookings.map(booking => booking.id === editingBookingId
        ? { id: booking.id, route: finalRoute, ...bookingData }
        : booking
      ));
    } else {
      const created: Booking = {
        id: Date.now().toString(),
        route: finalRoute,
        ...bookingData
      };
      setBookings(currentBookings => [created, ...currentBookings]);
    }

    setShowAddModal(false);
    setEditingBookingId(null);
    resetForm();
  };

  const filteredBookings = bookings.filter(b =>
    b.passenger.toLowerCase().includes(search.toLowerCase()) ||
    b.phone.includes(search) ||
    b.cedula.includes(search)
  );

  const formatCurrency = (amount: number) => amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });
  const formTotalValue = Number(newBooking.totalValue) || 0;
  const formPaidAmount = Number(newBooking.paidAmount) || 0;

  return (
    <div style={{ padding: '30px 40px', maxWidth: '100%', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <div>
          <h2 style={{ color: '#2D60A8', margin: 0, fontSize: '1.8rem' }}>
            📋 Panel de Administración - WD Travel
          </h2>
          <p style={{ color: '#6b7280', margin: '5px 0 0 0' }}>Gestión centralizada de reservas y clientes</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ padding: '12px 24px', backgroundColor: '#2D60A8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(45,96,168,0.2)' }}
        >
          ➕ Registrar Cliente / Venta (WhatsApp)
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar cliente por Nombre, Cédula o Celular..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '1rem' }}
        />
      </div>

      {/* Tabla estilo Excel */}
      <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#2D60A8', color: '#fff' }}>
              <th style={{ padding: '14px' }}>FECHA COMPRA</th>
              <th style={{ padding: '14px' }}>PASAJERO</th>
              <th style={{ padding: '14px' }}>CELULAR</th>
              <th style={{ padding: '14px' }}>RUTA</th>
              <th style={{ padding: '14px' }}>COD RESERVA</th>
              <th style={{ padding: '14px' }}>FECHA VIAJE</th>
              <th style={{ padding: '14px' }}>FECHA REGRESO</th>
              <th style={{ padding: '14px' }}>TIPO</th>
              <th style={{ padding: '14px' }}>AEROLÍNEA</th>
              <th style={{ padding: '14px' }}>PAGO</th>
              <th style={{ padding: '14px' }}>VALOR TOTAL</th>
              <th style={{ padding: '14px' }}>ABONADO</th>
              <th style={{ padding: '14px' }}>SALDO PENDIENTE</th>
              <th style={{ padding: '14px' }}>ESTADO DEL PAGO</th>
              <th style={{ padding: '14px' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b) => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '14px' }}>{b.purchaseDate}</td>
                <td style={{ padding: '14px', fontWeight: 'bold', color: '#111827' }}>{b.passenger}</td>
                <td style={{ padding: '14px' }}>{b.phone}</td>
                <td style={{ padding: '14px' }}>{b.route}</td>
                <td style={{ padding: '14px', color: b.bookingCode === 'PENDIENTE' ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{b.bookingCode || 'PENDIENTE'}</td>
                <td style={{ padding: '14px' }}>{b.travelDate}</td>
                <td style={{ padding: '14px' }}>{b.returnDate}</td>
                <td style={{ padding: '14px' }}>{b.isPackage ? 'PAQUETE' : 'TIQUETE'}</td>
                <td style={{ padding: '14px' }}>{b.airline}</td>
                <td style={{ padding: '14px' }}>{b.paymentMethod}</td>
                <td style={{ padding: '14px' }}>{formatCurrency(b.totalValue)}</td>
                <td style={{ padding: '14px' }}>{formatCurrency(b.paidAmount)}</td>
                <td style={{ padding: '14px', color: b.totalValue - b.paidAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>{formatCurrency(Math.max(0, b.totalValue - b.paidAmount))}</td>
                <td style={{ padding: '14px', color: b.paymentStatus === 'PAGADO' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{b.paymentStatus}</td>
                <td style={{ padding: '14px' }}>
                  <button 
                    onClick={() => setSelectedPassenger(b)}
                    style={{ padding: '6px 14px', backgroundColor: '#f3f4f6', color: '#2D60A8', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Ver Perfil
                  </button>
                  <button
                    onClick={() => handleEditClick(b)}
                    style={{ marginLeft: '8px', padding: '6px 14px', backgroundColor: '#E3B31D', color: '#2D60A8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteClick(b)}
                    style={{ marginLeft: '8px', padding: '6px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Perfil Detallado */}
      {selectedPassenger && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ color: '#2D60A8', marginTop: 0, borderBottom: '2px solid #E3B31D', paddingBottom: '10px' }}>👤 Perfil del Cliente</h3>
            <p style={{ marginTop: '15px' }}><strong>Nombre:</strong> {selectedPassenger.passenger}</p>
            <p><strong>Cédula:</strong> {selectedPassenger.cedula || 'No registrada'}</p>
            <p><strong>Celular / WhatsApp:</strong> {selectedPassenger.phone}</p>
            <p><strong>Ruta:</strong> {selectedPassenger.route}</p>
            <p><strong>Código de Reserva:</strong> {selectedPassenger.bookingCode}</p>
            <p><strong>Aerolínea:</strong> {selectedPassenger.airline}</p>
            <p><strong>Método de Pago:</strong> {selectedPassenger.paymentMethod}</p>
            <p><strong>Valor Total:</strong> {formatCurrency(selectedPassenger.totalValue)}</p>
            <p><strong>Valor Abonado:</strong> {formatCurrency(selectedPassenger.paidAmount)}</p>
            <p><strong>Saldo Pendiente:</strong> {formatCurrency(Math.max(0, selectedPassenger.totalValue - selectedPassenger.paidAmount))}</p>
            <p><strong>Estado del Pago:</strong> {selectedPassenger.paymentStatus}</p>
            <button 
              onClick={() => setSelectedPassenger(null)}
              style={{ marginTop: '20px', width: '100%', padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Registrar o editar venta manual */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', maxWidth: '720px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#2D60A8', marginTop: 0, borderBottom: '2px solid #E3B31D', paddingBottom: '10px' }}>{editingBookingId ? '✏️ Editar Cliente / Venta' : '➕ Registrar Cliente / Venta Manual'}</h3>
            
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Nombre Pasajero:</label>
                  <input required type="text" value={newBooking.passenger} onChange={e => setNewBooking({...newBooking, passenger: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Cédula:</label>
                  <input required type="text" value={newBooking.cedula} onChange={e => setNewBooking({...newBooking, cedula: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Celular:</label>
                  <input required type="text" value={newBooking.phone} onChange={e => setNewBooking({...newBooking, phone: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
              </div>

              {/* Origen */}
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <LocationSelector labelPrefix="Origen" value={origin} onChange={setOrigin} />
              </div>

              {/* Destino */}
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <LocationSelector labelPrefix="Destino" value={destination} onChange={setDestination} />
              </div>

              {/* Opción de Escalas */}
              <div style={{ padding: '12px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#9a3412', marginBottom: '8px' }}>
                  ¿El vuelo tiene escalas / conexiones?:
                </label>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <label style={{ cursor: 'pointer', fontWeight: '600' }}>
                    <input 
                      type="radio" 
                      name="layover" 
                      checked={!hasLayover} 
                      onChange={() => setHasLayover(false)} 
                      style={{ marginRight: '6px' }} 
                    />
                    No (Vuelo Directo)
                  </label>
                  <label style={{ cursor: 'pointer', fontWeight: '600' }}>
                    <input 
                      type="radio" 
                      name="layover" 
                      checked={hasLayover} 
                      onChange={() => setHasLayover(true)} 
                      style={{ marginRight: '6px' }} 
                    />
                    Sí (Con Escalas)
                  </label>
                </div>

                {hasLayover && (
                  <div style={{ marginTop: '12px' }}>
                    <label htmlFor="layover-count" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px', color: '#9a3412' }}>
                      Cantidad de escalas:
                    </label>
                    <select
                      id="layover-count"
                      value={layovers.length}
                      onChange={e => {
                        const count = Number(e.target.value);
                        setLayovers(current => Array.from({ length: count }, (_, index) => current[index] ?? ''));
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', marginBottom: '10px' }}
                    >
                      {Array.from({ length: 10 }, (_, index) => index + 1).map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>

                    {layovers.map((layover, index) => (
                      <div key={index} style={{ padding: '10px', marginBottom: '8px', backgroundColor: '#fff', borderRadius: '6px' }}>
                        <LocationSelector
                          labelPrefix={`Escala ${index + 1}`}
                          value={layover}
                          onChange={value => setLayovers(current => current.map((stop, stopIndex) => stopIndex === index ? value : stop))}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', color: '#374151' }}>
                  <strong>Ruta completa:</strong>{' '}
                  {[origin || 'Origen', ...(hasLayover ? layovers.map((stop, index) => stop || `Escala ${index + 1}`) : []), destination || 'Destino'].join(' ➔ ')}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Código Reserva:</label>
                  <input type="text" placeholder="Ej: 26940704" value={newBooking.bookingCode} onChange={e => setNewBooking({...newBooking, bookingCode: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Aerolínea:</label>
                  <input type="text" placeholder="Ej: Avianca, JetSmart" value={newBooking.airline} onChange={e => setNewBooking({...newBooking, airline: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Fecha Viaje:</label>
                  <input type="date" value={newBooking.travelDate} onChange={e => setNewBooking({...newBooking, travelDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Fecha Regreso:</label>
                  <input type="date" value={newBooking.returnDate} onChange={e => setNewBooking({...newBooking, returnDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Método de Pago:</label>
                <select value={newBooking.paymentMethod} onChange={e => setNewBooking({...newBooking, paymentMethod: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TARJETA">TARJETA</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Valor Total (COP):</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff' }}>
                    <span style={{ paddingLeft: '8px', color: '#374151', fontWeight: 'bold' }}>$</span>
                    <input type="number" min="0" step="100" required value={newBooking.totalValue} onChange={e => {
                    const totalValue = e.target.value === '' ? '' : Number(e.target.value);
                    const numericTotalValue = Number(totalValue) || 0;
                    setNewBooking({ ...newBooking, totalValue, paidAmount: newBooking.paymentStatus === 'PAGADO' ? numericTotalValue : Math.min(Number(newBooking.paidAmount) || 0, numericTotalValue) });
                    }} style={{ width: '100%', padding: '8px', border: 'none', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Estado del Pago:</label>
                  <select required value={newBooking.paymentStatus} onChange={e => {
                    const paymentStatus = e.target.value;
                    setNewBooking({
                      ...newBooking,
                      paymentStatus,
                      paidAmount: paymentStatus === 'PAGADO' ? formTotalValue : paymentStatus === 'PENDIENTE' ? 0 : newBooking.paidAmount
                    });
                  }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="ABONADO">ABONADO</option>
                    <option value="PAGADO">PAGADO</option>
                  </select>
                </div>
              </div>

              {newBooking.paymentStatus === 'ABONADO' && (
                <div style={{ padding: '12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Cantidad Abonada (COP):</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff' }}>
                    <span style={{ paddingLeft: '8px', color: '#374151', fontWeight: 'bold' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      max={formTotalValue}
                      step="100"
                      required
                      value={newBooking.paidAmount}
                      onChange={e => {
                        const paidAmount = e.target.value === '' ? '' : Math.min(formTotalValue, Math.max(0, Number(e.target.value)));
                        setNewBooking({ ...newBooking, paidAmount });
                      }}
                      style={{ width: '100%', padding: '8px', border: 'none', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: 'bold' }}>
                    <span>Abonado: {formatCurrency(formPaidAmount)}</span>
                    <span style={{ color: '#dc2626' }}>Falta: {formatCurrency(Math.max(0, formTotalValue - formPaidAmount))}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#E3B31D', color: '#2D60A8', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {editingBookingId ? 'Guardar Cambios' : 'Guardar Venta'}
                </button>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingBookingId(null); resetForm(); }} style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};