# React + TypeScript + Vite

## Persistencia de cotizaciones y ventas realizadas

- **Cotizaciones pendientes:** Se guardan y consultan en MongoDB en la colección `quotes` mediante los endpoints `POST /api/quotes` y `GET /api/quotes`.
- **Compras registradas (Ventas realizadas):** Al dar click en **Completar compra** y guardar con **Registrar compra y mover a Compras**, el registro se traslada de `quotes` al nuevo esquema/colección `ventas_realizadas` en MongoDB mediante `POST /api/sales` (o `POST /api/purchases`).
- **Consulta persistente:** La sección de **Compras registradas** consulta directamente las compras persistidas en `ventas_realizadas` mediante `GET /api/sales` al abrirse o seleccionarse, garantizando que los datos persistan y se mantengan actualizados.
- **Seguridad:** La conexión a la base de datos se obtiene exclusivamente desde la variable de entorno `MONGO_KEY` en el servidor Node/Express (`server.cjs`).

En Render, configura:

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Environment Variable:** `MONGO_KEY` con la cadena de conexión de MongoDB

Para desarrollo local, inicia el servidor con `MONGO_KEY="..." npm start` después de
construir el frontend. Vite redirige `/api` al servidor local en el puerto 3000.

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
