const path = require('node:path');
const express = require('express');
const { MongoClient } = require('mongodb');

const PORT = Number(process.env.PORT || 3000);
const MONGO_KEY = process.env.MONGO_KEY;

if (!MONGO_KEY) {
  throw new Error('La variable de entorno MONGO_KEY no está configurada.');
}

const app = express();
const mongoClient = new MongoClient(MONGO_KEY);
let quotesCollection;

app.use(express.json({ limit: '50kb' }));

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
    const result = await quotesCollection.insertOne({
      ...quote,
      createdAt: new Date()
    });
    console.log(`Cotización guardada correctamente: ${result.insertedId}`);
    response.status(201).json({ saved: true });
  } catch (error) {
    console.error('Error guardando la cotización:', error);
    response.status(500).json({ error: 'No fue posible guardar la cotización.' });
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
  await database.command({ ping: 1 });
  console.log(`Conexión con MongoDB establecida. Base de datos: ${database.databaseName}`);
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
}

start().catch(error => {
  console.error('No fue posible iniciar el servidor:', error);
  process.exitCode = 1;
});
