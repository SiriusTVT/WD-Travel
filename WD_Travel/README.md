# React + TypeScript + Vite

## Persistencia de cotizaciones y ventas realizadas

- **Cotizaciones pendientes:** Se guardan, consultan y editan en MongoDB en la colección `quotes` mediante los endpoints `POST /api/quotes`, `GET /api/quotes` y `PUT /api/quotes/:id`.
- **Compras registradas (Ventas realizadas):** Al dar click en **Completar compra** y guardar con **Registrar compra y mover a Compras**, el registro se traslada de `quotes` al nuevo esquema/colección `ventas_realizadas` en MongoDB mediante `POST /api/sales`. Además, al editar una compra desde el panel, los cambios se actualizan mediante `PUT /api/sales/:id`.
- **Consulta persistente:** La sección de **Compras registradas** consulta directamente las compras persistidas en `ventas_realizadas` mediante `GET /api/sales` al abrirse o seleccionarse, garantizando que los datos persistan y se mantengan actualizados.
- **Seguridad:** La conexión a la base de datos se obtiene exclusivamente desde la variable de entorno `MONGO_KEY` en el servidor Node/Express (`server.cjs`).
- **Aviso por correo:** Cada cotización nueva guardada en MongoDB genera un correo mediante Resend. El mensaje incluye la información de la cotización, excepto la cédula, que se excluye también de los datos de pasajeros.

En Render, configura estas variables de entorno:

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- `MONGO_KEY`: cadena de conexión de MongoDB.
- `ADMIN_BOOTSTRAP_EMAIL`: correo de la cuenta inicial de administrador.
- `ADMIN_BOOTSTRAP_PASSWORD`: contraseña inicial de esa cuenta; se guarda como hash scrypt, no como texto plano.
- `ADMIN_SESSION_SECRET`: secreto aleatorio largo para firmar las sesiones.
- `RESEND_API_KEY`: clave API de Resend.
- `RESEND_FROM_EMAIL`: remitente autorizado/verificado en Resend (por ejemplo, `WD Travel <cotizaciones@tu-dominio.com>`).
- `QUOTE_NOTIFICATION_EMAIL`: dirección de correo que recibirá los avisos, definida por el cliente.

Al iniciar el servidor, se crea la cuenta inicial en la colección MongoDB `users` si no existe; su documento contiene `email`, `passwordHash`, `role` (`admin` o `advisor`) y `createdAt`. Si la cuenta inicial ya existe, el arranque no reemplaza su contraseña. La página principal conserva el formulario público de cotización y no muestra controles de acceso administrativo. Para iniciar sesión, abre directamente `https://wd-travel.onrender.com/wdtraveladmin`. La sesión usa una cookie `HttpOnly` firmada que vence en 8 horas. Hay límite de intentos fallidos de inicio de sesión.

Ambos roles pueden consultar y editar cotizaciones y registrar/editar compras. Solo `admin` puede consultar ventas y eliminar cotizaciones o compras; esas restricciones se verifican en el servidor además de ocultar las acciones en la interfaz. La creación pública de cotizaciones sigue disponible.

Para desarrollo local, configura `MONGO_KEY`, `ADMIN_BOOTSTRAP_EMAIL`,
`ADMIN_BOOTSTRAP_PASSWORD` y `ADMIN_SESSION_SECRET` en el entorno e inicia el servidor con
`npm start` después de construir el frontend. En PowerShell:
`$env:MONGO_KEY = "..."`; `$env:ADMIN_BOOTSTRAP_EMAIL = "..."`;
`$env:ADMIN_BOOTSTRAP_PASSWORD = "..."`; `$env:ADMIN_SESSION_SECRET = "..."`; `npm start`. Vite redirige
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
