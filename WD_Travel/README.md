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
- `ADMIN_ACCESS_CODE`: código secreto para iniciar sesión como administrador. Usa un código largo, único y difícil de adivinar; no uses `wdtraveladmin` como código real.
- `RESEND_API_KEY`: clave API de Resend.
- `RESEND_FROM_EMAIL`: remitente autorizado/verificado en Resend (por ejemplo, `WD Travel <cotizaciones@tu-dominio.com>`).
- `QUOTE_NOTIFICATION_EMAIL`: dirección de correo que recibirá los avisos, definida por el cliente.

La página principal conserva el formulario público de cotización y no muestra controles de acceso administrativo. Para iniciar sesión, abre directamente `https://wd-travel.onrender.com/wdtraveladmin` e ingresa el valor configurado en `ADMIN_ACCESS_CODE`. La sesión se guarda en una cookie `HttpOnly` por un máximo de 8 horas; las consultas y modificaciones de cotizaciones y ventas requieren esa sesión. La creación pública de cotizaciones sigue disponible.

Para desarrollo local, configura `MONGO_KEY` y `ADMIN_ACCESS_CODE` en el entorno e inicia
el servidor con `npm start` después de construir el frontend. En PowerShell:
`$env:MONGO_KEY = "..."`; `$env:ADMIN_ACCESS_CODE = "..."`; `npm start`. Vite redirige
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
