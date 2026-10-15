# React + TypeScript + Vite

## Persistencia de cotizaciones

Las cotizaciones del formulario principal se guardan y consultan en MongoDB mediante los
endpoints `POST /api/quotes` y `GET /api/quotes`. Al abrir la aplicación, las cotizaciones
persistidas se cargan en la sección de cotizaciones pendientes del administrador. La conexión
se obtiene exclusivamente desde la variable de entorno `MONGO_KEY`; nunca se incluye en el
código del navegador.

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
