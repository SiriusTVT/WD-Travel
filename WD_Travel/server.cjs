const path = require('node:path');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = Number(process.env.PORT || 3000);
const MONGO_KEY = process.env.MONGO_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const QUOTE_NOTIFICATION_EMAIL = process.env.QUOTE_NOTIFICATION_EMAIL;

if (!MONGO_KEY) {
  throw new Error('La variable de entorno MONGO_KEY no está configurada.');
}

const app = express();
const mongoClient = new MongoClient(MONGO_KEY);
let quotesCollection;
let salesCollection;

app.use(express.json({ limit: '50kb' }));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function removeCedula(value) {
  if (Array.isArray(value)) {
    return value.map(removeCedula);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key.toLowerCase() !== 'cedula')
        .map(([key, item]) => [key, removeCedula(item)])
    );
  }
  return value;
}

async function sendQuoteNotification(quote) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || !QUOTE_NOTIFICATION_EMAIL) {
    console.error(
      'No se envió el aviso de cotización: configura RESEND_API_KEY, RESEND_FROM_EMAIL y QUOTE_NOTIFICATION_EMAIL.'
    );
    return false;
  }

  const safeQuote = removeCedula(quote);
  const labels = {
    id: 'ID de cotización',
    quoteDate: 'Fecha de cotización',
    purchaseDate: 'Fecha de compra',
    firstName: 'Nombres',
    lastName: 'Apellidos',
    name: 'Nombre',
    passenger: 'Titular',
    phone: 'Teléfono / WhatsApp',
    documentType: 'Tipo de documento',
    route: 'Ruta',
    bookingCode: 'Código de reserva',
    travelDate: 'Fecha de ida',
    returnDate: 'Fecha de regreso',
    tripType: 'Tipo de viaje',
    adultCount: 'Cantidad de adultos',
    childCount: 'Cantidad de niños',
    childAges: 'Edades de los niños',
    isTicket: 'Incluye tiquete',
    isPackage: 'Incluye paquete',
    airline: 'Aerolínea',
    paymentMethod: 'Método de pago',
    totalValue: 'Valor total',
    paymentStatus: 'Estado del pago',
    paidAmount: 'Valor pagado',
    passengers: 'Pasajeros'
  };
  const details = Object.entries(safeQuote)
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .map(([key, value]) => {
      const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      return {
        label: labels[key] || key,
        value: displayValue
      };
    });
  const text = details.map(({ label, value }) => `${label}:\n${value}`).join('\n\n');
  const html = details.map(({ label, value }) =>
    `<h3>${escapeHtml(label)}</h3><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(value)}</pre>`
  ).join('');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [QUOTE_NOTIFICATION_EMAIL],
        subject: `Nueva cotización recibida - ${safeQuote.passenger || safeQuote.id}`,
        text,
        html: `<h2>Nueva cotización recibida</h2>${html}`
      })
    });

    if (!response.ok) {
      console.error(`Resend rechazó el aviso de cotización (HTTP ${response.status}).`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error enviando el aviso de cotización:', error);
    return false;
  }
}

function buildIdFilter(id) {
  const filters = [{ id: String(id) }];
  if (ObjectId.isValid(id)) {
    try {
      filters.push({ _id: new ObjectId(id) });
    } catch {
      // Ignorar error de casteo
    }
  }
  return { $or: filters };
}

// Consultar cotizaciones pendientes
app.get('/api/quotes', async (request, response) => {
  try {
    const docs = await quotesCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    const quotes = docs.map(doc => {
      const { _id, ...rest } = doc;
      return {
        ...rest,
        id: rest.id || _id.toString()
      };
    });
    response.json(quotes);
  } catch (error) {
    console.error('Error consultando las cotizaciones:', error);
    response.status(500).json({ error: 'No fue posible consultar las cotizaciones.' });
  }
});

// Guardar nueva cotización
app.post('/api/quotes', async (request, response) => {
  const quote = request.body;

  if (
    !quote ||
    typeof quote !== 'object' ||
    typeof quote.firstName !== 'string' ||
    typeof quote.lastName !== 'string' ||
    typeof quote.phone !== 'string' ||
    typeof quote.cedula !== 'string' ||
    typeof quote.route !== 'string' ||
    typeof quote.travelDate !== 'string'
  ) {
    response.status(400).json({ error: 'La información de la cotización es inválida.' });
    return;
  }

  try {
    const id = quote.id || Date.now().toString();
    const savedQuote = {
      ...quote,
      id,
      createdAt: new Date()
    };
    const result = await quotesCollection.insertOne(savedQuote);
    console.log(`Cotización guardada correctamente: ${result.insertedId}`);

    const notificationSent = await sendQuoteNotification(savedQuote);
    response.status(201).json({ saved: true, id, notificationSent });
  } catch (error) {
    console.error('Error guardando la cotización:', error);
    response.status(500).json({ error: 'No fue posible guardar la cotización.' });
  }
});

// Actualizar cotización existente
app.put('/api/quotes/:id', async (request, response) => {
  try {
    const id = request.params.id;
    const { _id, ...updateData } = request.body;
    const result = await quotesCollection.updateOne(
      buildIdFilter(id),
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      console.warn(`No se encontró la cotización con ID ${id} para actualizar.`);
    } else {
      console.log(`Cotización con ID ${id} actualizada exitosamente en quotes.`);
    }
    response.json({ updated: true, matchedCount: result.matchedCount });
  } catch (error) {
    console.error('Error actualizando la cotización en quotes:', error);
    response.status(500).json({ error: 'No fue posible actualizar la cotización.' });
  }
});

// Eliminar cotización
app.delete('/api/quotes/:id', async (request, response) => {
  try {
    const id = request.params.id;
    await quotesCollection.deleteMany(buildIdFilter(id));
    response.json({ deleted: true });
  } catch (error) {
    console.error('Error eliminando cotización:', error);
    response.status(500).json({ error: 'No fue posible eliminar la cotización.' });
  }
});

// Consultar compras registradas / ventas realizadas
app.get(['/api/sales', '/api/purchases'], async (request, response) => {
  try {
    const docs = await salesCollection
      .find({})
      .sort({ createdAt: -1, purchaseDate: -1 })
      .limit(500)
      .toArray();
    const sales = docs.map(doc => {
      const { _id, ...rest } = doc;
      return {
        ...rest,
        id: rest.id || _id.toString()
      };
    });
    response.json(sales);
  } catch (error) {
    console.error('Error consultando las ventas registradas:', error);
    response.status(500).json({ error: 'No fue posible consultar las compras registradas.' });
  }
});

// Registrar compra / mover cotización al esquema de ventas_realizadas
app.post(['/api/sales', '/api/purchases'], async (request, response) => {
  const { quoteId, ...saleData } = request.body;

  if (
    !saleData ||
    typeof saleData !== 'object' ||
    typeof saleData.passenger !== 'string' ||
    typeof saleData.route !== 'string'
  ) {
    response.status(400).json({ error: 'La información de la compra es inválida.' });
    return;
  }

  try {
    const targetQuoteId = quoteId || saleData.id;

    // 1. Si viene de una cotización existente, eliminarla del esquema quotes
    if (targetQuoteId) {
      const deleteResult = await quotesCollection.deleteMany(buildIdFilter(targetQuoteId));
      if (deleteResult.deletedCount > 0) {
        console.log(`Cotización ${targetQuoteId} removida de quotes al completarse la compra.`);
      }
    }

    // 2. Preparar el registro para el nuevo esquema de ventas_realizadas
    const id = saleData.id || String(targetQuoteId) || Date.now().toString();
    const newSale = {
      ...saleData,
      id,
      purchaseDate: saleData.purchaseDate || new Date().toISOString().split('T')[0],
      createdAt: new Date()
    };

    // 3. Insertar o actualizar en ventas_realizadas
    await salesCollection.updateOne(
      buildIdFilter(id),
      { $set: newSale },
      { upsert: true }
    );

    console.log(`Compra registrada en ventas_realizadas con ID: ${id}`);
    response.status(201).json({ saved: true, id, sale: newSale });
  } catch (error) {
    console.error('Error guardando la compra en ventas_realizadas:', error);
    response.status(500).json({ error: 'No fue posible registrar la compra.' });
  }
});

// Actualizar compra existente
app.put(['/api/sales/:id', '/api/purchases/:id'], async (request, response) => {
  try {
    const id = request.params.id;
    const { _id, ...updateData } = request.body;
    const result = await salesCollection.updateOne(
      buildIdFilter(id),
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      console.warn(`No se encontró la compra con ID ${id} para actualizar.`);
    } else {
      console.log(`Compra con ID ${id} actualizada exitosamente en ventas_realizadas.`);
    }
    response.json({ updated: true, matchedCount: result.matchedCount });
  } catch (error) {
    console.error('Error actualizando la compra en ventas_realizadas:', error);
    response.status(500).json({ error: 'No fue posible actualizar la compra.' });
  }
});

// Eliminar compra
app.delete(['/api/sales/:id', '/api/purchases/:id'], async (request, response) => {
  try {
    const id = request.params.id;
    await salesCollection.deleteMany(buildIdFilter(id));
    response.json({ deleted: true });
  } catch (error) {
    console.error('Error eliminando la compra:', error);
    response.status(500).json({ error: 'No fue posible eliminar la compra.' });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get(/.*/, (request, response) => {
  response.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

async function start() {
  await mongoClient.connect();
  const database = mongoClient.db();
  quotesCollection = database.collection('quotes');
  salesCollection = database.collection('ventas_realizadas');
  await database.command({ ping: 1 });
  console.log(`Conexión con MongoDB establecida. Base de datos: ${database.databaseName}`);
  console.log('Colecciones activas: quotes y ventas_realizadas');
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
}

start().catch(error => {
  console.error('No fue posible iniciar el servidor:', error);
  process.exitCode = 1;
});
