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
const QRCode = require('qrcode');
const helmet = require('helmet');
const {
  buildOtpauthUrl,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  verifyTotp
} = require('./totp.cjs');

const PORT = Number(process.env.PORT || 3000);
const MONGO_KEY = process.env.MONGO_KEY;
const ADMIN_BOOTSTRAP_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const CREATE_ACCOUNT_SECRET = process.env.CREATE_ACCOUNT_SECRET;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
const ADMIN_SESSION_COOKIE = 'wdtravel_admin';
const ACCOUNT_CREATION_COOKIE = 'wdtravel_createcount';
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
// Si la sesión no se usa durante 5 minutos, deja de ser válida.
const ADMIN_SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const ACCOUNT_CREATION_SESSION_TTL_SECONDS = 15 * 60;
const PASSWORD_HASH_LENGTH = 64;
const PASSWORD_SALT_LENGTH = 16;
const scryptAsync = promisify(scrypt);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const QUOTE_NOTIFICATION_EMAIL = process.env.QUOTE_NOTIFICATION_EMAIL;
const TOTP_ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY;
const ENCRYPTED_PREFIX = 'enc:';
const QUOTE_WINDOW_MS = 10 * 60 * 1000;
const QUOTE_MAX_SUBMISSIONS = 5;
const ACCOUNT_MAX_ATTEMPTS = 10;

if (!MONGO_KEY) {
  throw new Error('La variable de entorno MONGO_KEY no está configurada.');
}
if (!ADMIN_SESSION_SECRET || ADMIN_SESSION_SECRET.length < 32) {
  throw new Error('La variable de entorno ADMIN_SESSION_SECRET debe tener al menos 32 caracteres.');
}
if (!TOTP_ENCRYPTION_KEY || TOTP_ENCRYPTION_KEY.length < 32) {
  throw new Error('La variable de entorno TOTP_ENCRYPTION_KEY debe tener al menos 32 caracteres.');
}

const app = express();
const mongoClient = new MongoClient(MONGO_KEY);
let quotesCollection;
let salesCollection;
let usersCollection;
let sessionsCollection;
let rateLimitsCollection;
let clientLocksCollection;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://www.instagram.com', 'https://*.cdninstagram.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'blob:'],
      frameSrc: ['https://www.instagram.com'],
      connectSrc: ["'self'", 'https://www.instagram.com'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '50kb' }));
app.set('trust proxy', 1);

// Lightweight liveness endpoint for external uptime checks.
// Does not query MongoDB or expose internal configuration.
app.get('/health', (_request, response) => {
  response.set('Cache-Control', 'no-store');
  response.status(200).json({ status: 'ok' });
});

// In-memory, bounded HTTP telemetry. Never record request bodies, query strings or client identifiers.
const monitorStartedAt = Date.now();
const monitorRecentErrors = [];
let monitorRequestCount = 0;
let monitorServerErrors = 0;
app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on('finish', () => {
    if (request.path.startsWith('/health') || request.path.startsWith('/api/admin/system-status')) return;
    monitorRequestCount += 1;
    if (response.statusCode >= 500) {
      monitorServerErrors += 1;
      monitorRecentErrors.push({
        at: new Date().toISOString(),
        status: response.statusCode,
        durationMs: Date.now() - startedAt
      });
      if (monitorRecentErrors.length > 30) monitorRecentErrors.shift();
    }
  });
  next();
});

function getAdminSessionSignature(payload) {
  return createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(payload)
    .digest('hex');
}

function getCookieValue(request, name) {
  const cookie = request.headers.cookie
    ?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`));
  return cookie ? cookie.slice(name.length + 1) : '';
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// Las sesiones se guardan en MongoDB (solo el hash del token), así se pueden revocar.
async function createAdminSession(email) {
  const token = randomBytes(32).toString('base64url');
  await sessionsCollection.insertOne({
    tokenHash: hashSessionToken(token),
    email,
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000)
  });
  return token;
}

// Cada uso renueva la actividad. Si pasa el tiempo de inactividad, la sesión ya no coincide y se rechaza.
async function getAdminSession(request) {
  const token = getCookieValue(request, ADMIN_SESSION_COOKIE);
  if (!token) return null;

  const now = new Date();
  const session = await sessionsCollection.findOneAndUpdate(
    {
      tokenHash: hashSessionToken(token),
      expiresAt: { $gt: now },
      lastActivityAt: { $gt: new Date(now.getTime() - ADMIN_SESSION_IDLE_TIMEOUT_MS) }
    },
    { $set: { lastActivityAt: now } },
    { returnDocument: 'after' }
  );
  return session ? { email: session.email } : null;
}

async function revokeAdminSession(request) {
  const token = getCookieValue(request, ADMIN_SESSION_COOKIE);
  if (token) {
    await sessionsCollection.deleteOne({ tokenHash: hashSessionToken(token) });
  }
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
    const session = await getAdminSession(request);
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

// Shallow readiness: checks the database without modifying any documents.
app.get('/health/ready', async (_request, response) => {
  response.set('Cache-Control', 'no-store');
  try {
    await Promise.race([
      mongoClient.db().command({ ping: 1 }),
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
    ]);
    response.status(200).json({ status: 'ready' });
  } catch (_error) {
    response.status(503).json({ status: 'unavailable' });
  }
});

// Protected diagnostics: only administrators can inspect internal component status.
app.get('/api/admin/system-status', requireAdministrator, async (_request, response) => {
  response.set('Cache-Control', 'no-store');
  const inspect = async (name, work) => {
    const started = Date.now();
    try {
      await Promise.race([
        work(),
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      return { name, status: 'ok', latencyMs: Date.now() - started };
    } catch (_error) {
      return { name, status: 'error', latencyMs: Date.now() - started };
    }
  };
  const checks = await Promise.all([
    inspect('mongodb', () => mongoClient.db().command({ ping: 1 })),
    inspect('quotes', () => quotesCollection.findOne({}, { projection: { _id: 1 } })),
    inspect('purchases', () => salesCollection.findOne({}, { projection: { _id: 1 } }))
  ]);
  const memory = process.memoryUsage();
  response.status(200).json({
    status: checks.every(check => check.status === 'ok') ? 'healthy' : 'degraded',
    checkedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: {
      rss: Math.round(memory.rss / 1048576),
      heapUsed: Math.round(memory.heapUsed / 1048576)
    },
    requestsSinceStart: monitorRequestCount,
    serverErrorsSinceStart: monitorServerErrors,
    recentErrors: monitorRecentErrors.slice(-10).reverse(),
    checks
  });
});

function getDocumentNumberHash(value) {
  const normalized = String(value).replace(/[^a-z\d]/gi, '').toUpperCase();
  return createHmac('sha256', TOTP_ENCRYPTION_KEY).update(normalized).digest('hex');
}

async function requireClientLock(request, response, next) {
  const documentNumber = request.body?.cedula;
  if (typeof documentNumber !== 'string' || !documentNumber.trim()) {
    response.status(400).json({ error: 'Se requiere una cédula válida para guardar este registro.' });
    return;
  }

  try {
    const lock = await clientLocksCollection.findOne({
      cedulaHash: getDocumentNumberHash(documentNumber),
      ownerEmail: request.authUser.email,
      expiresAt: { $gt: new Date() }
    });
    if (!lock) {
      response.status(423).json({
        error: 'La edición de este cliente no está bloqueada por tu sesión. Vuelve a abrir el registro e inténtalo nuevamente.'
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

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

async function createTwoFactorEnrollment(email) {
  const secret = generateTotpSecret();
  const qrDataUrl = await QRCode.toDataURL(buildOtpauthUrl(email, secret));
  return {
    encryptedSecret: encryptSecret(secret, TOTP_ENCRYPTION_KEY),
    qrDataUrl
  };
}

const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

// Contadores guardados en MongoDB: sobreviven reinicios y se comparten entre instancias.
async function isRateLimited(key, limit) {
  const entry = await rateLimitsCollection.findOne({ _id: key, resetAt: { $gt: new Date() } });
  return Boolean(entry && entry.count >= limit);
}

async function recordAttempt(key, windowMs) {
  const now = new Date();
  const updated = await rateLimitsCollection.findOneAndUpdate(
    { _id: key, resetAt: { $gt: now } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' }
  );
  if (updated) return;

  try {
    await rateLimitsCollection.updateOne(
      { _id: key },
      { $set: { count: 1, resetAt: new Date(now.getTime() + windowMs) } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

async function clearAttempts(key) {
  await rateLimitsCollection.deleteOne({ _id: key });
}

// Cuenta el intento por IP y por cuenta, para frenar la fuerza bruta contra una contraseña.
async function recordLoginFailure(ipAddress, email) {
  await recordAttempt(`login-ip:${ipAddress}`, LOGIN_ATTEMPT_WINDOW_MS);
  if (email) await recordAttempt(`login-account:${email}`, LOGIN_ATTEMPT_WINDOW_MS);
}

async function clearLoginAttempts(ipAddress, email) {
  await clearAttempts(`login-ip:${ipAddress}`);
  if (email) await clearAttempts(`login-account:${email}`);
}

app.post('/api/createcount/access', async (request, response) => {
  if (!CREATE_ACCOUNT_SECRET || CREATE_ACCOUNT_SECRET.length < 32) {
    response.status(503).json({ error: 'El acceso de creación de cuentas no está configurado correctamente.' });
    return;
  }

  const ipAddress = request.ip || request.socket.remoteAddress || 'unknown';
  if (await isRateLimited(`login-ip:${ipAddress}`, LOGIN_MAX_ATTEMPTS)) {
    response.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos e inténtalo nuevamente.' });
    return;
  }

  const secret = request.body?.secret;
  if (typeof secret !== 'string' || secret.length > 512) {
    await recordLoginFailure(ipAddress, '');
    response.status(401).json({ error: 'El código secreto no es válido.' });
    return;
  }

  const expected = createHash('sha256').update(CREATE_ACCOUNT_SECRET).digest();
  const provided = createHash('sha256').update(secret).digest();
  if (!timingSafeEqual(expected, provided)) {
    await recordLoginFailure(ipAddress, '');
    response.status(401).json({ error: 'El código secreto no es válido.' });
    return;
  }

  await clearLoginAttempts(ipAddress, '');
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
    const twoFactor = await createTwoFactorEnrollment(email);
    const result = await usersCollection.insertOne({
      email,
      passwordHash: await hashPassword(password),
      role,
      twoFactorSecret: twoFactor.encryptedSecret,
      twoFactorLastStep: null,
      createdAt: new Date()
    });
    response.status(201).json({
      created: true,
      id: result.insertedId.toString(),
      email,
      role,
      qrDataUrl: twoFactor.qrDataUrl
    });
  } catch (error) {
    if (error.code === 11000) {
      response.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
      return;
    }
    console.error('Error creando cuenta desde /createcount:', error);
    response.status(500).json({ error: 'No fue posible crear la cuenta.' });
  }
});

app.post('/api/createcount/accounts/two-factor', requireAccountCreationSession, async (request, response) => {
  const email = typeof request.body?.email === 'string'
    ? request.body.email.trim().toLowerCase()
    : '';
  if (!email) {
    response.status(400).json({ error: 'Ingresa el correo de la cuenta.' });
    return;
  }

  try {
    const user = await usersCollection.findOne({ email }, { projection: { _id: 1 } });
    if (!user) {
      response.status(404).json({ error: 'No existe una cuenta con ese correo.' });
      return;
    }

    const twoFactor = await createTwoFactorEnrollment(email);
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { twoFactorSecret: twoFactor.encryptedSecret, twoFactorLastStep: null } }
    );
    await sessionsCollection.deleteMany({ email });
    response.json({ email, qrDataUrl: twoFactor.qrDataUrl });
  } catch (error) {
    console.error('Error configurando doble factor:', error);
    response.status(500).json({ error: 'No fue posible configurar el doble factor.' });
  }
});

app.post('/api/admin/login', async (request, response, next) => {
  const ipAddress = request.ip || request.socket.remoteAddress || 'unknown';
  if (await isRateLimited(`login-ip:${ipAddress}`, LOGIN_MAX_ATTEMPTS)) {
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

  if (await isRateLimited(`login-account:${email}`, ACCOUNT_MAX_ATTEMPTS)) {
    response.status(429).json({ error: 'Demasiados intentos para esta cuenta. Espera 15 minutos e inténtalo nuevamente.' });
    return;
  }

  try {
    const user = await usersCollection.findOne({ email });
    if (typeof password === 'string' && password.length > 256) {
      await recordLoginFailure(ipAddress, email);
      response.status(401).json({ error: 'Correo o contraseña incorrectos.' });
      return;
    }
    const validPassword = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, '00000000000000000000000000000000:' + '0'.repeat(128));
    if (!user || !validPassword || !['admin', 'advisor'].includes(user.role)) {
      await recordLoginFailure(ipAddress, email);
      response.status(401).json({ error: 'Correo o contraseña incorrectos.' });
      return;
    }

    if (!user.twoFactorSecret) {
      response.status(403).json({
        error: 'Esta cuenta no tiene doble factor configurado. Pide a un administrador que lo configure desde /createcount.'
      });
      return;
    }

    const code = typeof request.body?.code === 'string'
      ? request.body.code.replace(/\s/g, '')
      : '';
    const step = verifyTotp(decryptSecret(user.twoFactorSecret, TOTP_ENCRYPTION_KEY), code);
    if (step === null) {
      await recordLoginFailure(ipAddress, email);
      response.status(401).json({ error: 'Correo, contraseña o código de verificación incorrectos.' });
      return;
    }

    // Cada código solo puede usarse una vez dentro de su ventana de validez.
    const replayCheck = await usersCollection.updateOne(
      {
        _id: user._id,
        $or: [
          { twoFactorLastStep: null },
          { twoFactorLastStep: { $exists: false } },
          { twoFactorLastStep: { $lt: step } }
        ]
      },
      { $set: { twoFactorLastStep: step } }
    );
    if (replayCheck.matchedCount === 0) {
      await recordLoginFailure(ipAddress, email);
      response.status(401).json({ error: 'Correo, contraseña o código de verificación incorrectos.' });
      return;
    }

    await clearLoginAttempts(ipAddress, email);
    const token = await createAdminSession(user.email);
    const secure = getSecureCookieAttribute(request);
    response.setHeader(
      'Set-Cookie',
      `${ADMIN_SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/${secure}`
    );
    response.json({ authenticated: true, role: user.role });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/session', requireAdmin, (request, response) => {
  response.json({ authenticated: true, role: request.authUser.role });
});

app.post('/api/admin/logout', async (request, response, next) => {
  try {
    await revokeAdminSession(request);
  } catch (error) {
    next(error);
    return;
  }
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

function formatQuoteDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value || '';
  }
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

async function sendQuoteNotification(quote) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL || !QUOTE_NOTIFICATION_EMAIL) {
    console.error(
      'No se envió el aviso de cotización: configura RESEND_API_KEY, RESEND_FROM_EMAIL y QUOTE_NOTIFICATION_EMAIL.'
    );
    return false;
  }

  const passengerName = [quote.firstName, quote.lastName]
    .filter(value => typeof value === 'string' && value.trim())
    .join(' ')
    || quote.passenger
    || 'Cliente';
  const childCount = Number(quote.childCount) || 0;
  const childAges = Array.isArray(quote.childAges)
    ? quote.childAges.filter(age => Number.isInteger(age)).join(', ')
    : '';
  const serviceLabels = {
    TIQUETE: 'Tiquete',
    HOTEL: 'Hotel',
    TIQUETE_HOTEL: 'Tiquete y Hotel',
    PAQUETES: 'Paquetes'
  };
  const serviceType = Object.prototype.hasOwnProperty.call(serviceLabels, quote.serviceType)
    ? quote.serviceType
    : quote.isPackage
      ? (quote.packageType || quote.packageName ? 'PAQUETES' : 'TIQUETE_HOTEL')
      : 'TIQUETE';
  const service = serviceLabels[serviceType];
  const isHotelOnly = serviceType === 'HOTEL';
  const tripType = isHotelOnly
    ? 'Estadía'
    : quote.tripType === 'ROUND_TRIP' || quote.returnDate
      ? 'Ida y vuelta'
      : 'Solo ida';
  const packageTypeLabels = {
    'paquetes-migratorios': 'Paquete migratorio',
    'paquetes-hotel-vuelos': 'Paquetes de hotel y vuelos',
    'paquetes-laborales': 'Paquetes con oferta laboral',
    'asistencias-viaje': 'Asistencias de viaje'
  };
  const packageTypeLabel = typeof quote.packageType === 'string' &&
    Object.prototype.hasOwnProperty.call(packageTypeLabels, quote.packageType)
    ? packageTypeLabels[quote.packageType]
    : '';
  const details = [
    { label: 'Nombre', value: passengerName },
    { label: 'Teléfono / WhatsApp', value: quote.phone },
    { label: 'Tipo de documento', value: quote.documentType },
    { label: 'Ruta', value: quote.route },
    { label: 'Tipo de viaje', value: tripType },
    { label: isHotelOnly ? 'Fecha de ingreso' : 'Fecha de ida', value: formatQuoteDate(quote.travelDate) },
    ...(quote.returnDate
      ? [{ label: isHotelOnly ? 'Fecha de salida' : 'Fecha de regreso', value: formatQuoteDate(quote.returnDate) }]
      : []),
    { label: 'Adultos', value: String(Number(quote.adultCount) || 0) },
    { label: 'Niños', value: String(childCount) },
    ...(childCount > 0 && childAges
      ? [{ label: 'Edades de los niños', value: childAges }]
      : []),
    { label: 'Servicio solicitado', value: service },
    ...(quote.isPackage && packageTypeLabel
      ? [{ label: 'Tipo de paquete', value: packageTypeLabel }]
      : []),
    ...(quote.isPackage && typeof quote.packageName === 'string' && quote.packageName.trim()
      ? [{ label: 'Paquete de interés', value: quote.packageName.trim() }]
      : [])
  ].filter(detail => detail.value !== undefined && detail.value !== null && detail.value !== '');

  const text = [
    'NUEVA SOLICITUD DE COTIZACIÓN',
    '',
    'Se recibió una nueva solicitud con estos datos:',
    '',
    ...details.map(({ label, value }) => `${label}: ${value}`)
  ].join('\n');
  const rows = details.map(({ label, value }) => `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #e5eaf1;color:#64748b;font-size:14px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e5eaf1;color:#173964;font-size:15px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>
  `).join('');
  const html = `
    <div style="margin:0;padding:32px 16px;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#173964;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <div style="padding:24px 28px;background:#173964;color:#ffffff;">
          <p style="margin:0 0 6px;color:#f2c94c;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">WD Travel</p>
          <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">Nueva solicitud de cotización</h1>
          <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">Datos enviados por ${escapeHtml(passengerName)}</p>
        </div>
        <div style="padding:22px 18px 26px;">
          <p style="margin:0 10px 16px;color:#475569;font-size:14px;line-height:1.5;">Un cliente está solicitando información para su viaje. Estos son los datos necesarios para preparar la cotización:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5eaf1;border-collapse:collapse;border-radius:8px;">
            <tbody>${rows}</tbody>
          </table>
          <p style="margin:18px 10px 0;color:#64748b;font-size:12px;">Este mensaje fue generado automáticamente desde el formulario de cotización de WD Travel.</p>
        </div>
      </div>
    </div>
  `;

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
        subject: `Nueva solicitud de cotización - ${passengerName}`,
        text,
        html
      })
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error(
        `Resend rechazó el aviso de cotización (HTTP ${response.status}): ${errorDetails || 'sin detalles'}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error enviando el aviso de cotización:', error);
    return false;
  }
}

// Cifra el campo "cedula" en cualquier nivel del documento (titular, pasajeros, etc.).
function mapSensitiveFields(value, mapper) {
  if (Array.isArray(value)) return value.map(item => mapSensitiveFields(item, mapper));
  if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      key === 'cedula' && typeof item === 'string' ? mapper(item) : mapSensitiveFields(item, mapper)
    ]));
  }
  return value;
}

function protectSensitiveFields(value) {
  return mapSensitiveFields(value, cedula => (
    cedula && !cedula.startsWith(ENCRYPTED_PREFIX)
      ? ENCRYPTED_PREFIX + encryptSecret(cedula, TOTP_ENCRYPTION_KEY)
      : cedula
  ));
}

function protectBookingFields(value) {
  const protectedFields = protectSensitiveFields(value);
  if (typeof value?.cedula === 'string' && value.cedula.trim()) {
    protectedFields.cedulaHash = getDocumentNumberHash(value.cedula);
  }
  return protectedFields;
}

function revealSensitiveFields(value) {
  return mapSensitiveFields(value, cedula => (
    cedula.startsWith(ENCRYPTED_PREFIX)
      ? decryptSecret(cedula.slice(ENCRYPTED_PREFIX.length), TOTP_ENCRYPTION_KEY)
      : cedula
  ));
}

// Cifra las cédulas que ya estaban guardadas en texto plano.
async function migrateSensitiveFields(collection) {
  const docs = await collection.find({ cedula: { $exists: true } }).toArray();
  let migrated = 0;
  for (const doc of docs) {
    const { _id, ...fields } = doc;
    const cedula = revealSensitiveFields({ cedula: fields.cedula }).cedula;
    const protectedFields = protectSensitiveFields(fields);
    if (cedula) protectedFields.cedulaHash = getDocumentNumberHash(cedula);
    if (JSON.stringify(protectedFields) !== JSON.stringify(fields)) {
      await collection.updateOne({ _id }, { $set: protectedFields });
      migrated += 1;
    }
  }
  if (migrated > 0) console.log(`Cédulas cifradas en ${collection.collectionName}: ${migrated}`);
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

function requireClientUnlocked(getCollection) {
  return async (request, response, next) => {
    try {
      const record = await getCollection().findOne(buildIdFilter(request.params.id), {
        projection: { cedulaHash: 1 }
      });
      if (record?.cedulaHash) {
        const lock = await clientLocksCollection.findOne({
          cedulaHash: record.cedulaHash,
          ownerEmail: { $ne: request.authUser.email },
          expiresAt: { $gt: new Date() }
        });
        if (lock) {
          response.status(423).json({
            error: `No se puede eliminar el registro mientras ${lock.ownerEmail} lo está editando.`
          });
          return;
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

app.post('/api/client-locks', requireAdmin, async (request, response, next) => {
  const { cedula, recordId } = request.body || {};
  if (typeof cedula !== 'string' || !/^[a-z\d]{5,15}$/i.test(cedula)) {
    response.status(400).json({ error: 'Ingresa una cédula válida para bloquear la edición.' });
    return;
  }

  try {
    const now = new Date();
    const cedulaHash = getDocumentNumberHash(cedula);
    const lock = await clientLocksCollection.findOneAndUpdate(
      {
        cedulaHash,
        $or: [
          { ownerEmail: request.authUser.email },
          { expiresAt: { $lte: now } }
        ]
      },
      {
        $set: {
          ownerEmail: request.authUser.email,
          recordId: typeof recordId === 'string' ? recordId : '',
          expiresAt: new Date(now.getTime() + 90_000)
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    response.json({ locked: true, expiresAt: lock.expiresAt });
  } catch (error) {
    if (error.code === 11000) {
      const currentLock = await clientLocksCollection.findOne({
        cedulaHash: getDocumentNumberHash(cedula),
        expiresAt: { $gt: new Date() }
      });
      response.status(409).json({
        error: 'Otro asesor está editando este cliente.',
        lockedBy: currentLock?.ownerEmail || 'otro asesor'
      });
      return;
    }
    next(error);
  }
});

app.delete('/api/client-locks/:cedula', requireAdmin, async (request, response, next) => {
  try {
    await clientLocksCollection.deleteOne({
      cedulaHash: getDocumentNumberHash(request.params.cedula),
      ownerEmail: request.authUser.email
    });
    response.json({ released: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/client-history/:cedula', requireAdmin, async (request, response) => {
  const { cedula } = request.params;
  if (!/^[a-z\d]{5,15}$/i.test(cedula)) {
    response.status(400).json({ error: 'La cédula consultada no es válida.' });
    return;
  }

  try {
    const cedulaHash = getDocumentNumberHash(cedula);
    const [quoteDocs, saleDocs] = await Promise.all([
      quotesCollection.find({ cedulaHash }).sort({ createdAt: -1 }).toArray(),
      salesCollection.find({ cedulaHash }).sort({ createdAt: -1 }).toArray()
    ]);
    const toHistoryRecord = (doc, recordType) => {
      const { _id, ...rest } = revealSensitiveFields(doc);
      delete rest.cedulaHash;
      return {
        ...rest,
        id: rest.id || _id.toString(),
        recordType
      };
    };
    response.json([
      ...quoteDocs.map(doc => toHistoryRecord(doc, 'quote')),
      ...saleDocs.map(doc => toHistoryRecord(doc, 'purchase'))
    ].sort((first, second) =>
      new Date(second.createdAt || second.quoteDate || second.purchaseDate || 0).getTime()
      - new Date(first.createdAt || first.quoteDate || first.purchaseDate || 0).getTime()
    ));
  } catch (error) {
    console.error('Error consultando el historial de viajes del cliente:', error);
    response.status(500).json({ error: 'No fue posible consultar el historial del cliente.' });
  }
});

const CLIENT_SOURCES = new Set(['whatsapp', 'instagram', 'facebook', 'website', 'referral', 'other']);
const isValidClientSource = value => typeof value === 'string' && CLIENT_SOURCES.has(value);

// Consultar cotizaciones pendientes
app.get('/api/quotes', requireAdmin, async (request, response) => {
  try {
    const docs = await quotesCollection
      .find({})
      .sort({ createdAt: 1, _id: 1 })
      .limit(500)
      .toArray();
    const quotes = docs.map(doc => {
      const { _id, ...rest } = revealSensitiveFields(doc);
      delete rest.cedulaHash;
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

app.post('/api/quotes/manual', requireAdmin, requireClientLock, async (request, response) => {
  const quote = request.body;
  if (
    !quote ||
    typeof quote !== 'object' ||
    typeof quote.firstName !== 'string' ||
    typeof quote.lastName !== 'string' ||
    typeof quote.passenger !== 'string' ||
    typeof quote.phone !== 'string' ||
    typeof quote.cedula !== 'string' ||
    typeof quote.route !== 'string' ||
    typeof quote.travelDate !== 'string'
  ) {
    response.status(400).json({ error: 'La información del cliente es inválida.' });
    return;
  }

  try {
    const { _id, ...fields } = quote;
    const id = fields.id || randomBytes(16).toString('hex');
    const savedQuote = protectBookingFields({
      ...fields,
      id,
      source: isValidClientSource(fields.source) ? fields.source : 'whatsapp',
      quoteStatus: 'PENDING',
      quoteDate: fields.quoteDate || new Date().toISOString().split('T')[0],
      advisorEmail: request.authUser.email,
      createdAt: new Date()
    });
    await quotesCollection.insertOne(savedQuote);
    response.status(201).json({ saved: true, id });
  } catch (error) {
    console.error('Error guardando el cliente registrado manualmente:', error);
    response.status(500).json({ error: 'No fue posible guardar el cliente.' });
  }
});

// Guardar nueva cotización
app.post('/api/quotes', async (request, response) => {
  const quote = request.body;
  const ipAddress = request.ip || request.socket.remoteAddress || 'unknown';

  if (await isRateLimited(`quotes-ip:${ipAddress}`, QUOTE_MAX_SUBMISSIONS)) {
    response.status(429).json({ error: 'Recibimos muchas solicitudes desde tu conexión. Espera unos minutos e inténtalo nuevamente.' });
    return;
  }
  await recordAttempt(`quotes-ip:${ipAddress}`, QUOTE_WINDOW_MS);

  // Campo trampa (honeypot): los bots suelen llenar todos los campos. Se responde como si se guardara.
  if (quote && typeof quote === 'object' && typeof quote.website === 'string' && quote.website.trim() !== '') {
    response.status(201).json({ saved: true, id: null, notificationSent: false });
    return;
  }

  if (
    !quote ||
    typeof quote !== 'object' ||
    typeof quote.firstName !== 'string' ||
    typeof quote.lastName !== 'string' ||
    typeof quote.phone !== 'string' ||
    typeof quote.cedula !== 'string' ||
    typeof quote.route !== 'string' ||
    typeof quote.travelDate !== 'string' ||
    quote.privacyAccepted !== true
  ) {
    response.status(400).json({
      error: 'La información de la cotización es inválida o falta aceptar la política de privacidad.'
    });
    return;
  }

  try {
    const id = quote.id || randomBytes(16).toString('hex');
    const { website: _website, privacyAccepted: _privacyAccepted, ...fields } = quote;
    const createdAt = new Date();
    const savedQuote = protectBookingFields({
      ...fields,
      id,
      source: 'website',
      quoteStatus: 'PENDING',
      quoteDate: fields.quoteDate || createdAt.toISOString().split('T')[0],
      privacyAcceptedAt: createdAt,
      createdAt
    });
    const result = await quotesCollection.insertOne(savedQuote);
    console.log(`Cotización guardada correctamente: ${result.insertedId}`);

    const notificationSent = await sendQuoteNotification({ ...fields, id, createdAt });
    response.status(201).json({ saved: true, id, notificationSent });
  } catch (error) {
    console.error('Error guardando la cotización:', error);
    response.status(500).json({ error: 'No fue posible guardar la cotización.' });
  }
});

// Actualizar cotización existente
app.put('/api/quotes/:id', requireAdmin, requireClientLock, async (request, response) => {
  try {
    const id = request.params.id;
    const { _id, ...updateData } = request.body;
    const result = await quotesCollection.updateOne(
      buildIdFilter(id),
      { $set: { ...protectBookingFields(updateData), updatedAt: new Date() } }
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

app.patch('/api/quotes/:id/status', requireAdmin, requireClientLock, async (request, response) => {
  const { quoteStatus } = request.body || {};
  if (!['PENDING', 'SENT'].includes(quoteStatus)) {
    response.status(400).json({ error: 'El estado de la cotización no es válido.' });
    return;
  }

  try {
    const update = {
      quoteStatus,
      updatedAt: new Date()
    };
    if (quoteStatus === 'SENT') {
      update.sentAt = new Date();
      update.advisorEmail = request.authUser.email;
    }

    const result = await quotesCollection.updateOne(
      { $and: [buildIdFilter(request.params.id), { quoteStatus: { $ne: 'PURCHASED' } }] },
      { $set: update }
    );
    if (result.matchedCount === 0) {
      response.status(409).json({ error: 'La cotización ya está asociada a una compra y no puede cambiar de estado.' });
      return;
    }
    response.json({
      updated: true,
      quoteStatus,
      advisorEmail: update.advisorEmail,
      sentAt: update.sentAt
    });
  } catch (error) {
    console.error('Error actualizando el estado de la cotización:', error);
    response.status(500).json({ error: 'No fue posible actualizar el estado de la cotización.' });
  }
});

// Eliminar cotización
app.delete('/api/quotes/:id', requireAdministrator, requireClientUnlocked(() => quotesCollection), async (request, response) => {
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
      .toArray();
    const sales = docs.map(doc => {
      const { _id, ...rest } = revealSensitiveFields(doc);
      delete rest.cedulaHash;
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

function isValidCommission(value) {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= 1000000000;
}

// Registrar compra / mover cotización al esquema de ventas_realizadas
app.post(['/api/sales', '/api/purchases'], requireAdmin, requireClientLock, async (request, response) => {
  const { quoteId, ...saleData } = request.body || {};

  if (saleData && Object.hasOwn(saleData, 'source') && saleData.source !== '' && !isValidClientSource(saleData.source)) {
    response.status(400).json({ error: 'El canal de origen es inválido.' });
    return;
  }
  if (saleData && Object.hasOwn(saleData, 'commissionAmount') && !isValidCommission(saleData.commissionAmount)) {
    response.status(400).json({ error: 'La comisión debe ser un valor entero válido en COP, entre 0 y 1.000.000.000.' });
    return;
  }
  if (quoteId && !isValidCommission(saleData?.commissionAmount)) {
    response.status(400).json({ error: 'Debes registrar la comisión manual al completar una cotización.' });
    return;
  }

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
    const targetQuoteId = quoteId || saleData.originQuoteId || '';
    const sourceQuote = targetQuoteId
      ? await quotesCollection.findOne(buildIdFilter(targetQuoteId))
      : null;

    // Preparar el registro para el esquema de ventas realizadas.
    const id = saleData.id || (targetQuoteId ? String(targetQuoteId) : randomBytes(16).toString('hex'));
    const existingSale = await salesCollection.findOne(buildIdFilter(id));
    if (existingSale) {
      if (targetQuoteId && (
        String(targetQuoteId) === String(id) ||
        String(existingSale.originQuoteId || '') === String(targetQuoteId)
      )) {
        await quotesCollection.updateOne(buildIdFilter(targetQuoteId), {
          $set: { quoteStatus: 'PURCHASED', purchaseId: id, purchasedAt: new Date() }
        });
        response.json({ saved: true, id, alreadyRegistered: true });
        return;
      }
      response.status(409).json({ error: 'Ya existe una compra con este identificador. No se modificó el registro anterior.' });
      return;
    }

    const newSale = protectBookingFields({
      ...saleData,
      id,
      ...(targetQuoteId ? { originQuoteId: targetQuoteId } : {}),
      source: isValidClientSource(saleData.source)
        ? saleData.source
        : isValidClientSource(sourceQuote?.source) ? sourceQuote.source : undefined,
      advisorEmail: saleData.advisorEmail || sourceQuote?.advisorEmail || request.authUser.email,
      purchaseDate: saleData.purchaseDate || new Date().toISOString().split('T')[0],
      paymentHistory: Array.isArray(saleData.paymentHistory)
        ? saleData.paymentHistory
        : Number(saleData.paidAmount) > 0
          ? [{
            amount: Number(saleData.paidAmount),
            date: saleData.purchaseDate || new Date().toISOString().split('T')[0],
            method: saleData.paymentMethod || ''
          }]
          : [],
      createdAt: new Date()
    });

    await salesCollection.insertOne(newSale);
    if (targetQuoteId) {
      await quotesCollection.updateOne(buildIdFilter(targetQuoteId), {
        $set: { quoteStatus: 'PURCHASED', purchaseId: id, purchasedAt: new Date() }
      });
    }

    console.log(`Compra registrada en ventas_realizadas con ID: ${id}`);
    response.status(201).json({ saved: true, id });
  } catch (error) {
    console.error('Error guardando la compra en ventas_realizadas:', error);
    response.status(500).json({ error: 'No fue posible registrar la compra.' });
  }
});

// Actualizar compra existente
app.put(['/api/sales/:id', '/api/purchases/:id'], requireAdmin, requireClientLock, async (request, response) => {
  try {
    const id = request.params.id;
    const { _id, ...updateData } = request.body;
    if (Object.hasOwn(updateData, 'source') && updateData.source !== '' && !isValidClientSource(updateData.source)) {
      response.status(400).json({ error: 'El canal de origen es inválido.' });
      return;
    }
    if (Object.hasOwn(updateData, 'commissionAmount') && !isValidCommission(updateData.commissionAmount)) {
      response.status(400).json({ error: 'La comisión debe ser un valor entero válido en COP, entre 0 y 1.000.000.000.' });
      return;
    }
    const result = await salesCollection.updateOne(
      buildIdFilter(id),
      { $set: { ...protectBookingFields(updateData), updatedAt: new Date() } }
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
app.delete(['/api/sales/:id', '/api/purchases/:id'], requireAdministrator, requireClientUnlocked(() => salesCollection), async (request, response) => {
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
  sessionsCollection = database.collection('sessions');
  rateLimitsCollection = database.collection('rate_limits');
  clientLocksCollection = database.collection('client_locks');
  await database.command({ ping: 1 });
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await sessionsCollection.createIndex({ tokenHash: 1 }, { unique: true });
  await sessionsCollection.createIndex({ email: 1 });
  await sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await rateLimitsCollection.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
  await quotesCollection.createIndex({ cedulaHash: 1 });
  await salesCollection.createIndex({ cedulaHash: 1 });
  await clientLocksCollection.createIndex({ cedulaHash: 1 }, { unique: true });
  await clientLocksCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await migrateSensitiveFields(quotesCollection);
  await migrateSensitiveFields(salesCollection);

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
