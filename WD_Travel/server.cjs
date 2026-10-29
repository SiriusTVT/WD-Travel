const path = require('node:path');
const {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual
} = require('node:crypto');
const { promisify } = require('node:util');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = Number(process.env.PORT || 3000);
const MONGO_KEY = process.env.MONGO_KEY;
const ADMIN_BOOTSTRAP_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const CREATE_ACCOUNT_SECRET = process.env.CREATE_ACCOUNT_SECRET;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || randomBytes(32).toString('hex');
const ADMIN_SESSION_COOKIE = 'wdtravel_admin';
const ACCOUNT_CREATION_COOKIE = 'wdtravel_createcount';
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const ACCOUNT_CREATION_SESSION_TTL_SECONDS = 15 * 60;
const PASSWORD_HASH_LENGTH = 64;
const PASSWORD_SALT_LENGTH = 16;
const scryptAsync = promisify(scrypt);
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
let usersCollection;

app.use(express.json({ limit: '50kb' }));
app.set('trust proxy', 1);

function getAdminSessionSignature(payload) {
  return createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(payload)
    .digest('hex');
}

function getAdminSession(request) {
  const cookie = request.headers.cookie
    ?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const session = cookie?.slice(ADMIN_SESSION_COOKIE.length + 1);
  const [payload, signature] = session?.split('.') || [];

  if (!payload || !signature || !/^[a-f\d]{64}$/i.test(signature)) {
    return null;
  }

  const expected = Buffer.from(getAdminSessionSignature(payload), 'hex');
  const provided = Buffer.from(signature, 'hex');
  if (!timingSafeEqual(expected, provided)) return null;

  let sessionData;
  try {
    sessionData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (
    typeof sessionData.email !== 'string'
    || !Number.isSafeInteger(sessionData.issuedAt)
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (sessionData.issuedAt > now || now - sessionData.issuedAt > ADMIN_SESSION_TTL_SECONDS) {
    return null;
  }

  return sessionData;
}

function getAccountCreationSession(request) {
  const cookie = request.headers.cookie
    ?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${ACCOUNT_CREATION_COOKIE}=`));
  const session = cookie?.slice(ACCOUNT_CREATION_COOKIE.length + 1);
  const [payload, signature] = session?.split('.') || [];

  if (!payload || !signature || !/^[a-f\d]{64}$/i.test(signature)) return null;

  const expected = Buffer.from(getAdminSessionSignature(payload), 'hex');
  const provided = Buffer.from(signature, 'hex');
  if (!timingSafeEqual(expected, provided)) return null;

  let sessionData;
  try {
    sessionData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    sessionData.purpose !== 'account-creation'
    || !Number.isSafeInteger(sessionData.issuedAt)
    || sessionData.issuedAt > now
    || now - sessionData.issuedAt > ACCOUNT_CREATION_SESSION_TTL_SECONDS
  ) {
    return null;
  }

  return sessionData;
}

function requireRoles(...allowedRoles) {
  return async (request, response, next) => {
    const session = getAdminSession(request);
    if (!session) {
      response.status(401).json({ error: 'Se requiere una sesión válida.' });
      return;
    }

    try {
      const user = await usersCollection.findOne(
        { email: session.email },
        { projection: { email: 1, role: 1 } }
      );
      if (!user || !['admin', 'advisor'].includes(user.role)) {
        response.status(401).json({ error: 'La cuenta no está autorizada.' });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        response.status(403).json({ error: 'Tu rol no tiene permiso para esta acción.' });
        return;
      }

      request.authUser = { email: user.email, role: user.role };
      next();
    } catch (error) {
      next(error);
    }
  }
}

const requireAdmin = requireRoles('admin', 'advisor');
const requireAdministrator = requireRoles('admin');

function requireAccountCreationSession(request, response, next) {
  if (!CREATE_ACCOUNT_SECRET) {
    response.status(503).json({ error: 'El acceso de creación de cuentas no está configurado.' });
    return;
  }
  if (!getAccountCreationSession(request)) {
    response.status(401).json({ error: 'Ingresa el código secreto para continuar.' });
    return;
  }
  next();
}

function getSecureCookieAttribute(request) {
  const isHttps = process.env.NODE_ENV === 'production'
    || request.headers['x-forwarded-proto'] === 'https';
  return isHttps ? '; Secure' : '';
}

async function hashPassword(password) {
  const salt = randomBytes(PASSWORD_SALT_LENGTH);
  const derivedKey = await scryptAsync(password, salt, PASSWORD_HASH_LENGTH);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, passwordHash) {
  const [saltHex, hashHex] = String(passwordHash).split(':');
  if (
    !/^[a-f\d]{32}$/i.test(saltHex || '')
    || !/^[a-f\d]{128}$/i.test(hashHex || '')
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, salt, PASSWORD_HASH_LENGTH);
  return timingSafeEqual(expected, actual);
}

const loginAttempts = new Map();
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function isLoginRateLimited(ipAddress) {
  const attempts = loginAttempts.get(ipAddress);
  if (!attempts) return false;

  if (Date.now() - attempts.startedAt >= LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttempts.delete(ipAddress);
    return false;
  }

  return attempts.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLogin(ipAddress) {
  const current = loginAttempts.get(ipAddress);
  if (!current || Date.now() - current.startedAt >= LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttempts.set(ipAddress, { startedAt: Date.now(), count: 1 });
    return;
  }
  current.count += 1;
}

app.post('/api/createcount/access', (request, response) => {
  if (!CREATE_ACCOUNT_SECRET || CREATE_ACCOUNT_SECRET.length < 32) {
    response.status(503).json({ error: 'El acceso de creación de cuentas no está configurado correctamente.' });
    return;
  }

  const ipAddress = request.ip || request.socket.remoteAddress || 'unknown';
  if (isLoginRateLimited(ipAddress)) {
    response.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos e inténtalo nuevamente.' });
    return;
  }

  const secret = request.body?.secret;
  if (typeof secret !== 'string' || secret.length > 512) {
    recordFailedLogin(ipAddress);
    response.status(401).json({ error: 'El código secreto no es válido.' });
    return;
  }

  const expected = createHash('sha256').update(CREATE_ACCOUNT_SECRET).digest();
  const provided = createHash('sha256').update(secret).digest();
  if (!timingSafeEqual(expected, provided)) {
    recordFailedLogin(ipAddress);
    response.status(401).json({ error: 'El código secreto no es válido.' });
    return;
  }

  loginAttempts.delete(ipAddress);
  const payload = Buffer.from(JSON.stringify({
    purpose: 'account-creation',
    issuedAt: Math.floor(Date.now() / 1000)
  })).toString('base64url');
  const secure = getSecureCookieAttribute(request);
  response.setHeader(
    'Set-Cookie',
    `${ACCOUNT_CREATION_COOKIE}=${payload}.${getAdminSessionSignature(payload)}; HttpOnly; SameSite=Strict; Path=/api/createcount; Max-Age=${ACCOUNT_CREATION_SESSION_TTL_SECONDS}${secure}`
  );
  response.json({ authorized: true });
});

app.get('/api/createcount/session', requireAccountCreationSession, (request, response) => {
  response.json({ authorized: true });
});

app.post('/api/createcount/logout', (request, response) => {
  const secure = getSecureCookieAttribute(request);
  response.setHeader(
    'Set-Cookie',
    `${ACCOUNT_CREATION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/createcount; Max-Age=0${secure}`
  );
  response.json({ authorized: false });
});

app.post('/api/createcount/accounts', requireAccountCreationSession, async (request, response) => {
  const email = typeof request.body?.email === 'string'
    ? request.body.email.trim().toLowerCase()
    : '';
  const password = request.body?.password;
  const role = request.body?.role;

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || typeof password !== 'string'
    || password.length < 12
    || password.length > 256
    || !['admin', 'advisor'].includes(role)
  ) {
    response.status(400).json({
      error: 'Ingresa un correo válido, una contraseña de 12 a 256 caracteres y un rol válido.'
    });
    return;
  }

  try {
    const result = await usersCollection.insertOne({
      email,
      passwordHash: await hashPassword(password),
      role,
      createdAt: new Date()
    });
    response.status(201).json({ created: true, id: result.insertedId.toString(), email, role });
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
      return;
    }
    console.error('Error creando cuenta desde /createcount:', error);
    response.status(500).json({ error: 'No fue posible crear la cuenta.' });
  }
});

app.post('/api/admin/login', async (request, response, next) => {
  const ipAddress = request.ip || request.socket.remoteAddress || 'unknown';
  if (isLoginRateLimited(ipAddress)) {
    response.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos e inténtalo nuevamente.' });
    return;
  }

  const email = typeof request.body?.email === 'string'
    ? request.body.email.trim().toLowerCase()
    : '';
  const password = request.body?.password;
  if (!email || typeof password !== 'string' || password.length === 0) {
    response.status(400).json({ error: 'Ingresa el correo y la contraseña.' });
    return;
  }

  try {
    const user = await usersCollection.findOne({ email });
    if (typeof password === 'string' && password.length > 256) {
      recordFailedLogin(ipAddress);
      response.status(401).json({ error: 'Correo o contraseña incorrectos.' });
      return;
    }
    const validPassword = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, '00000000000000000000000000000000:' + '0'.repeat(128));
    if (!user || !validPassword || !['admin', 'advisor'].includes(user.role)) {
      recordFailedLogin(ipAddress);
      response.status(401).json({ error: 'Correo o contraseña incorrectos.' });
      return;
    }

    loginAttempts.delete(ipAddress);
    const payload = Buffer.from(JSON.stringify({
      email: user.email,
      issuedAt: Math.floor(Date.now() / 1000)
    })).toString('base64url');
    const secure = getSecureCookieAttribute(request);
    response.setHeader(
      'Set-Cookie',
      `${ADMIN_SESSION_COOKIE}=${payload}.${getAdminSessionSignature(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}${secure}`
    );
    response.json({ authenticated: true, role: user.role });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/session', requireAdmin, (request, response) => {
  response.json({ authenticated: true, role: request.authUser.role });
});

app.post('/api/admin/logout', (request, response) => {
  const secure = getSecureCookieAttribute(request);
  response.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`
  );
  response.json({ authenticated: false });
});

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
app.get('/api/quotes', requireAdmin, async (request, response) => {
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
app.put('/api/quotes/:id', requireAdmin, async (request, response) => {
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
app.delete('/api/quotes/:id', requireAdministrator, async (request, response) => {
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
app.get(['/api/sales', '/api/purchases'], requireAdministrator, async (request, response) => {
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
app.post(['/api/sales', '/api/purchases'], requireAdmin, async (request, response) => {
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
app.put(['/api/sales/:id', '/api/purchases/:id'], requireAdmin, async (request, response) => {
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
app.delete(['/api/sales/:id', '/api/purchases/:id'], requireAdministrator, async (request, response) => {
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
  usersCollection = database.collection('users');
  await database.command({ ping: 1 });
  await usersCollection.createIndex({ email: 1 }, { unique: true });

  if (ADMIN_BOOTSTRAP_EMAIL && ADMIN_BOOTSTRAP_PASSWORD) {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_BOOTSTRAP_EMAIL)
      || ADMIN_BOOTSTRAP_PASSWORD.length < 12
      || ADMIN_BOOTSTRAP_PASSWORD.length > 256
    ) {
      throw new Error('Las variables de bootstrap del administrador tienen un formato inválido.');
    }

    const existingAdmin = await usersCollection.findOne({ email: ADMIN_BOOTSTRAP_EMAIL });
    if (!existingAdmin) {
      await usersCollection.insertOne({
        email: ADMIN_BOOTSTRAP_EMAIL,
        passwordHash: await hashPassword(ADMIN_BOOTSTRAP_PASSWORD),
        role: 'admin',
        createdAt: new Date()
      });
      console.log('Cuenta inicial de administrador creada en la colección users.');
    } else if (existingAdmin.role !== 'admin') {
      await usersCollection.updateOne(
        { _id: existingAdmin._id },
        { $set: { role: 'admin' } }
      );
      console.log('La cuenta inicial se actualizó al rol de administrador.');
    }
  } else {
    console.warn('No se creó la cuenta inicial: configura ADMIN_BOOTSTRAP_EMAIL y ADMIN_BOOTSTRAP_PASSWORD.');
  }

  if (!process.env.ADMIN_SESSION_SECRET) {
    console.warn('ADMIN_SESSION_SECRET no está configurado; las sesiones cerrarán al reiniciar el servidor.');
  }

  console.log(`Conexión con MongoDB establecida. Base de datos: ${database.databaseName}`);
  console.log('Colecciones activas: quotes, ventas_realizadas y users');
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
}

start().catch(error => {
  console.error('No fue posible iniciar el servidor:', error);
  process.exitCode = 1;
});
