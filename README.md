# 💸 Mis Gastos

App de gastos mensuales con autenticación por email y **Firebase Firestore** como base de datos. Cada usuario ve y gestiona únicamente sus propios gastos.

## Stack

- **React 18** + **Vite 5**
- **Firebase 10** — Authentication (email/password) + Firestore
- **React Router 6**
- CSS por componente (sin frameworks)

## Funcionalidades

- 🔐 Login y registro con email/contraseña
- ➕ Alta, edición y borrado de gastos
- 🗂️ Categorías (comida, transporte, vivienda, servicios, ocio, salud, compras, otros)
- 📅 Navegación por mes
- 📊 Resumen mensual: total gastado, movimientos y desglose por categoría
- 📱 Diseño responsive (sidebar + vista mobile)

## Estructura

```
src/
├── config/
│   ├── firebase.js          ← Inicialización de Firebase
│   └── categorias.js        ← Catálogo de categorías
├── context/
│   └── AuthContext.jsx       ← Auth global + useAuth
├── hooks/
│   └── useGastos.js          ← Carga/CRUD de gastos del mes
├── services/
│   └── gastosService.js      ← Acceso a Firestore
├── components/
│   ├── common/PrivateRoute.jsx
│   ├── layout/Layout.jsx + .css
│   ├── MesSelector.jsx + .css
│   └── GastoForm.jsx + .css
├── pages/
│   ├── Login.jsx + .css       ← Login / registro
│   ├── Home.jsx + .css        ← Resumen del mes
│   └── Gastos.jsx + .css      ← CRUD de gastos
├── utils/format.js           ← Formato de moneda y fechas
├── App.jsx · main.jsx · index.css
```

## Modelo de datos (Firestore)

Colección **`gastos`**, un documento por gasto:

| Campo        | Tipo      | Ejemplo        |
|--------------|-----------|----------------|
| `uid`        | string    | uid del usuario |
| `descripcion`| string    | "Supermercado" |
| `monto`      | number    | 15000          |
| `categoria`  | string    | "comida"       |
| `fecha`      | string    | "2026-10-15"   |
| `mes`        | string    | "2026-10"      |
| `createdAt`  | timestamp | (server)       |

El campo `mes` se guarda derivado de `fecha` para poder consultar por mes de forma eficiente.

## Setup

### 1. Crear el proyecto en Firebase

1. Entrá a [console.firebase.google.com](https://console.firebase.google.com) y creá un proyecto.
2. **Authentication → Sign-in method →** activá **Email/Password**.
3. **Firestore Database →** creá la base en modo producción.
4. **Project settings → Your apps →** registrá una app web y copiá las credenciales.

### 2. Variables de entorno

```bash
cp .env.example .env
```

Completá `.env` con tus credenciales de Firebase.

### 3. Reglas e índices de Firestore

Las reglas (`firestore.rules`) restringen cada gasto a su dueño. El índice compuesto
(`firestore.indexes.json`) es necesario para la consulta por `uid` + `mes` ordenada por `fecha`.

Con la [Firebase CLI](https://firebase.google.com/docs/cli):

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

> Si no usás la CLI: pegá el contenido de `firestore.rules` en la consola de Firebase,
> y creá el índice compuesto cuando la app te muestre el enlace en la consola del navegador.

### 4. Correr en desarrollo

```bash
npm install
npm run dev
```

## Scripts

| Comando           | Descripción                 |
|-------------------|-----------------------------|
| `npm run dev`     | Servidor de desarrollo      |
| `npm run build`   | Build de producción         |
| `npm run preview` | Previsualizar el build      |
| `npm run lint`    | Linter                      |
