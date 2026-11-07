# React + TypeScript + Vite

## Seguridad

- Las sesiones de administrador se guardan en MongoDB (`sessions`) y se revocan al cerrar sesión o al reconfigurar el doble factor de una cuenta.
- Los límites de intentos (inicio de sesión por IP y por cuenta, y envíos de cotizaciones por IP) se guardan en MongoDB (`rate_limits`), así que sobreviven reinicios y se comparten entre instancias.
- El formulario de cotización tiene un campo trampa (honeypot) y exige aceptar la política de privacidad. La política está en `/politica-de-privacidad` y es un borrador: revísala con un asesor legal antes de publicarla.
- Las cédulas se cifran al guardarse. Al iniciar el servidor se cifran también los registros que ya estaban en texto plano.
- Las cabeceras de seguridad (CSP, HSTS y anti-iframe) las aplica `helmet`.

## Doble factor de autenticación (Google Authenticator)

- Al crear una cuenta en `/createcount` se genera un código QR (TOTP, RFC 6238). Escanéalo con Google Authenticator; el QR se muestra en pantalla después de crear la cuenta.
- Para cuentas existentes (incluida la inicial) usa el formulario "Configurar doble factor" en `/createcount`: genera un QR nuevo y reemplaza el anterior.
- El inicio de sesión exige correo, contraseña y el código de 6 dígitos. Cada código solo sirve una vez y el límite de 5 intentos fallidos por 15 minutos también aplica.
- Si pierdes el acceso al teléfono, un administrador debe generar un QR nuevo desde `/createcount`.

## Persistencia de cotizaciones y ventas realizadas

- **Cotizaciones pendientes:** Se guardan, consultan y editan en MongoDB en la colección `quotes` mediante los endpoints `POST /api/quotes`, `GET /api/quotes` y `PUT /api/quotes/:id`. Se muestran en orden de llegada, con la más antigua primero para dar prioridad a la primera solicitud.
- **Compras registradas (Ventas realizadas):** Al dar click en **Completar compra** y guardar con **Registrar compra y mover a Compras**, se crea una compra independiente en `ventas_realizadas` mediante `POST /api/sales`; la cotización original permanece en `quotes` con estado `PURCHASED` y queda relacionada por `originQuoteId`. Al editar una compra, los cambios se actualizan mediante `PUT /api/sales/:id`.
- **Consulta persistente:** La sección de **Compras registradas** consulta directamente las compras persistidas en `ventas_realizadas` mediante `GET /api/sales` al abrirse o seleccionarse, garantizando que los datos persistan y se mantengan actualizados.
- **Edición exclusiva por cliente:** Antes de editar o guardar una cotización o compra, el panel obtiene un bloqueo por cédula en `client_locks`. El bloqueo se renueva mientras el formulario está abierto, se libera al guardar o cancelar y vence automáticamente si la sesión deja de renovarlo. El servidor rechaza escrituras sin el bloqueo vigente.
- **Sincronización, agrupación e historial:** Las vistas del panel consultan los cambios automáticamente cada cinco segundos mientras están abiertas. En las tablas de cotizaciones y compras, los registros se agrupan por cédula normalizada y cada cliente aparece una sola vez por sección. Al expandirlo se consultan todas sus cotizaciones y compras, mostrando cada viaje por separado y conservando sus identificadores y datos.
- **Seguimiento de cotizaciones:** Las solicitudes nuevas empiezan como pendientes. Desde su historial, un asesor puede marcarlas como enviadas o devolverlas a pendientes; las pestañas **Cotizaciones pendientes** y **Cotizaciones enviadas** se actualizan automáticamente. Al completar la compra, la cotización original se conserva con estado de compra realizada y queda relacionada con la compra mediante `originQuoteId`.
- **Clientes abonados e historial de pagos:** Las compras con abono parcial aparecen en **Clientes abonados**, con total, valor recibido, saldo, fecha límite e indicador de vencimiento. Se pueden registrar abonos adicionales desde esa pestaña o desde el historial de compras; cada pago se conserva en `paymentHistory` con fecha y método. Al completar el pago, el viaje sale de **Clientes abonados**, pero permanece en compras con todo su historial.
- **Registro de ventas por WhatsApp:** El selector administrativo usa el mismo catálogo de paquetes y las mismas fechas de disponibilidad que la página principal y el formulario público. Los registros manuales guardan el asesor responsable y las ventas mantienen el historial de pagos.
- **Paquetes promocionales:** Las tarjetas, el carrusel de destinos y el formulario se alimentan del catálogo vigente. El carrusel muestra ofertas con destinos; el formulario permite seleccionar todos los paquetes activos, incluidos los servicios de asistencia. Las tres ofertas con vencimiento del 1 de noviembre se retiraron y se agregaron las opciones de Puerto Plata, Ciudad de México y Río de Janeiro, con reserva antes del 8 de noviembre de 2026. Las ofertas con fecha límite se ocultan automáticamente al vencer.
- **Tipos de servicio:** El formulario distingue Tiquete, Hotel, Tiquete y Hotel, y Paquetes. Hotel solicita destino y fechas de ingreso/salida, sin pedir origen ni aerolínea. La selección de Paquetes usa el mismo catálogo vigente que las tarjetas y el carrusel.
- **Fotografías de destinos:** Las imágenes promocionales se reemplazaron por fotografías locales de Madrid, Puerto Plata, Ciudad de México, Río de Janeiro, Budva, Dubrovnik y Podgorica. Los créditos y las licencias se muestran junto a las fotos; las atribuciones CC BY/CC BY-SA enlazan a sus fuentes.
- **Seguridad:** La conexión a la base de datos se obtiene exclusivamente desde la variable de entorno `MONGO_KEY` en el servidor Node/Express (`server.cjs`).
- **Aviso por correo:** Cada cotización nueva guardada en MongoDB genera un correo mediante Resend con un resumen organizado de los datos del formulario: contacto, ruta o destino, fechas, viajeros y servicio solicitado. No incluye cédula, código de reserva, aerolínea, pagos, identificadores ni otros campos internos.

En Render, configura estas variables de entorno:

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- `MONGO_KEY`: cadena de conexión de MongoDB.
- `ADMIN_BOOTSTRAP_EMAIL`: correo de la cuenta inicial de administrador.
- `ADMIN_BOOTSTRAP_PASSWORD`: contraseña inicial de esa cuenta; se guarda como hash scrypt, no como texto plano.
- `ADMIN_SESSION_SECRET`: secreto aleatorio largo para firmar las sesiones.
- `CREATE_ACCOUNT_SECRET`: código secreto de al menos 32 caracteres para abrir el gestor oculto de cuentas.
- `TOTP_ENCRYPTION_KEY`: clave de al menos 32 caracteres que cifra los secretos del doble factor y las cédulas guardadas en la base de datos. Si cambia, los códigos y las cédulas cifradas dejan de poder leerse; no la cambies sin migrar los datos.
- `RESEND_API_KEY`: clave API de Resend.
- `RESEND_FROM_EMAIL`: remitente autorizado/verificado en Resend (por ejemplo, `WD Travel <cotizaciones@tu-dominio.com>`).
- `QUOTE_NOTIFICATION_EMAIL`: dirección de correo del administrador que recibirá los avisos de cotización.

El remitente (`RESEND_FROM_EMAIL`) y el destinatario (`QUOTE_NOTIFICATION_EMAIL`) cumplen funciones distintas. Para entregar avisos a otros destinatarios, verifica en Resend un dominio propio y usa como remitente una dirección de ese dominio; no uses el correo personal del administrador como remitente a menos que su dominio esté verificado en Resend. Si Resend rechaza el envío, revisa los logs del servicio en Render para ver el detalle devuelto por la API.

Al iniciar el servidor, se crea la cuenta inicial en la colección MongoDB `users` si no existe; su documento contiene `email`, `passwordHash`, `role` (`admin` o `advisor`) y `createdAt`. Si la cuenta inicial ya existe, el arranque no reemplaza su contraseña. La página principal conserva el formulario público de cotización y no muestra controles de acceso administrativo. Para iniciar sesión, abre directamente `https://wd-travel.onrender.com/wdtraveladmin`. La sesión usa una cookie `HttpOnly` firmada que vence en 8 horas. Hay límite de intentos fallidos de inicio de sesión.

Ambos roles pueden consultar y editar cotizaciones y registrar/editar compras. Solo `admin` puede consultar ventas y eliminar cotizaciones o compras; esas restricciones se verifican en el servidor además de ocultar las acciones en la interfaz. La creación pública de cotizaciones sigue disponible.

Para crear cuentas, abre directamente `/createcount`, valida el código secreto y registra
el correo, una contraseña de al menos 12 caracteres y el rol (`admin` o `advisor`). La
cuenta se guarda en `users` con contraseña hasheada y no se devuelve ni almacena como texto
plano. El acceso desbloqueado dura 15 minutos. No incluyas el código secreto en el frontend
ni lo compartas con los usuarios de la aplicación.

Para desarrollo local, configura `MONGO_KEY`, `ADMIN_BOOTSTRAP_EMAIL`,
`ADMIN_BOOTSTRAP_PASSWORD`, `ADMIN_SESSION_SECRET` y `CREATE_ACCOUNT_SECRET` en el entorno e inicia el servidor con
`npm start` después de construir el frontend. En PowerShell:
`$env:MONGO_KEY = "..."`; `$env:ADMIN_BOOTSTRAP_EMAIL = "..."`;
`$env:ADMIN_BOOTSTRAP_PASSWORD = "..."`; `$env:ADMIN_SESSION_SECRET = "..."`;
`$env:CREATE_ACCOUNT_SECRET = "..."`; `npm start`. Vite redirige
`/api` al servidor local en el puerto 3000.
También debes configurar las tres variables de Resend anteriores; el remitente debe estar
verificado en Resend. Si falta alguna o Resend rechaza/falla el envío, la cotización se
guarda de todas formas y el sistema informa que no se pudo enviar el aviso.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
