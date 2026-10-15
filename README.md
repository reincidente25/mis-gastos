# 💸 Mis Gastos

App de gastos mensuales **compartida en pareja**, con autenticación por email y **Firebase Firestore**. Está modelada sobre una planilla real: cada mes es una lista de **conceptos recurrentes** (ESBA, Seguro, Expensas, servicios, terapias…) donde solo completás el importe, más gastos sueltos y un bloque aparte de **tarjetas**.

## Stack

- **React 18** + **Vite 5**
- **Firebase 10** — Authentication (email/password) + Firestore
- **React Router 6**
- CSS por componente, **tema claro**

## Funcionalidades

- 🔐 Login y registro con email/contraseña
- 🏠 **Hogar compartido**: ambos inician sesión con su cuenta y ven/editan el mismo presupuesto (se invita con un código)
- 🗂️ **Conceptos recurrentes**: las filas fijas de cada mes; solo cargás el importe
- ➕ Gastos sueltos por mes
- 💳 **Tarjetas**: resumen mensual por tarjeta, separado del total de gastos
- 📊 Resumen del mes: gastos, tarjetas, total general y desglose por categoría
- 📅 Navegación por mes · 📱 responsive

## Modelo de datos (Firestore)

```
usuarios/{uid}                     { email, hogarId }
hogares/{hogarId}                  { nombre, codigo, miembros[], createdBy }
  ├── conceptos/{id}               { nombre, categoria, orden, activo }
  ├── gastos/{id}                  { mes, conceptoId|null, concepto, categoria, monto }
  ├── tarjetas/{id}                { nombre, orden, activa }
  └── resumenesTarjeta/{id}        { mes, tarjetaId, tarjetaNombre, monto }
```

- `mes` es `YYYY-MM`. Los gastos recurrentes usan id `${mes}__${conceptoId}` (upsert sin duplicados).
- Los datos financieros viven bajo el hogar; las reglas solo permiten acceso a sus **miembros**.

## Setup

### 1. Crear el proyecto en Firebase
1. [console.firebase.google.com](https://console.firebase.google.com) → nuevo proyecto.
2. **Authentication → Sign-in method →** activá **Email/Password**.
3. **Firestore Database →** creá la base.
4. **Project settings → Your apps →** registrá una app web y copiá las credenciales.

### 2. Variables de entorno
```bash
cp .env.example .env    # y completá con tus credenciales
```

### 3. Reglas de Firestore
No se necesitan índices compuestos (las consultas son por igualdad). Desplegá las reglas:
```bash
firebase deploy --only firestore:rules
```
o pegá `firestore.rules` en la consola de Firebase.

### 4. Correr
```bash
npm install
npm run dev
```

## Uso en pareja

1. Uno de los dos se registra y, en el onboarding, elige **Crear hogar** (arranca con los conceptos y tarjetas típicos ya cargados).
2. En **Ajustes** copia el **código de invitación**.
3. La otra persona se registra y elige **Unirme con código**.
4. Desde ahí, ambos ven y editan el mismo presupuesto.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Previsualizar el build |
| `npm run lint` | Linter |
