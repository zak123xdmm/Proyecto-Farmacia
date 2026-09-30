# Sistema de Farmacia — Backend + Angular Dashboard

Esta versión conserva el backend Express + MySQL y añade un frontend **Angular standalone** conectado a sus endpoints reales.

## Estructura

- `backend expressJS/` — API Express, autenticación, controladores y acceso MySQL.
- `frontend-angular/` — nuevo dashboard Angular responsive.
- `backend expressJS/farmacia-dashboard-legacy.html` — dashboard anterior, conservado como respaldo.

## Cómo ejecutarlo

### 1. Backend

Desde `backend expressJS`:

```bash
npm install
node index.js
```

Debe aparecer:

`Servidor Express corriendo en http://localhost:3000`

### 2. Angular

En otra terminal:

```bash
cd frontend-angular
npm install
npm start
```

Abre:

`http://localhost:4200`

El archivo `proxy.conf.json` envía `/api` a `http://localhost:3000`, por lo que Angular consume el backend sin hardcodear el puerto en cada servicio.

### 3. Usuario de prueba

El backend existente documenta:

- Usuario: `admin`
- Contraseña: `admin123`

La sesión se guarda en `localStorage` y un interceptor Angular agrega automáticamente `Authorization: Bearer <token>` a las peticiones protegidas.

## Qué quedó conectado

- Login → `POST /api/auth/login`
- Sesión → `GET /api/auth/me`
- Dashboard → reportes, inventario y alertas
- Inventario → listar, buscar, editar y desactivar medicamentos
- Ventas → medicamentos/stock y registro de ventas
- Reportes → diario, semanal y mensual
- Lotes → consulta e ingreso
- Categorías → listar, crear y eliminar
- Usuarios → listar y activar/desactivar
- Roles → navegación y rutas administrativas protegidas

## Producción

Puedes construir Angular:

```bash
cd frontend-angular
npm run build
```

El backend detecta automáticamente `frontend-angular/dist/farmacia-dashboard/browser` y puede servir el frontend desde Express en `http://localhost:3000`.

> Nota: el backend sigue dependiendo de la base MySQL configurada en `.env`. No se modificaron las credenciales de base de datos.
