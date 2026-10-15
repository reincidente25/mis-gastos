# 🚀 React + Firebase Template

Template base para proyectos con React, Vite, Firebase y React Router.

## Stack

- **React 18** + **Vite 5**
- **Firebase 10** (Auth + Firestore)
- **React Router 6**
- CSS por componente (sin frameworks)

## Estructura

```
src/
├── config/
│   └── firebase.js          ← Inicialización de Firebase
├── context/
│   └── AuthContext.jsx       ← Auth global + useAuth hook
├── components/
│   ├── common/
│   │   └── PrivateRoute.jsx  ← Protección de rutas
│   └── layout/
│       ├── Layout.jsx        ← Sidebar + header mobile
│       └── Layout.css
├── pages/
│   ├── Login.jsx
│   ├── Login.css
│   └── Home.jsx
├── services/
│   ├── temporadasService.js
│   └── equiposService.js
├── hooks/
│   └── useUserTeam.js
├── App.jsx                   ← Router + rutas
├── main.jsx                  ← Entry point
└── index.css                 ← Variables globales + reset
```

## Setup

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Firebase
Copiá `.env.example` a `.env` y completá con tus credenciales:
```bash
cp .env.example .env
```

### 3. Correr en desarrollo
```bash
npm run dev
```

## Agregar una nueva página

1. Crear `src/pages/MiPagina.jsx`
2. Importar en `App.jsx` y agregar la `<Route>`
3. Agregar el `NavItem` en `Layout.jsx`

## Variables CSS

Todas en `src/index.css`:
```css
--color-bg:      #0f1117   /* fondo principal */
--color-surface: #1a1d27   /* cards/sidebar */
--color-border:  #2a2d3e   /* bordes */
--color-primary: #6366f1   /* acento */
--color-text:    #e2e8f0   /* texto */
--color-muted:   #64748b   /* texto secundario */
```
