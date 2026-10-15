// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HogarProvider, useHogar } from './context/HogarContext';
import { EstructuraProvider } from './context/EstructuraContext';

// Pages
import Login      from './pages/Login';
import Onboarding from './pages/Onboarding';
import Home       from './pages/Home';
import Gastos     from './pages/Gastos';
import Tabla      from './pages/Tabla';
import Categorias from './pages/Categorias';
import Conceptos  from './pages/Conceptos';
import Grupos     from './pages/Grupos';
import Ajustes    from './pages/Ajustes';

const Pantalla = ({ children }) => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
    {children}
  </div>
);

// Requiere usuario logueado.
const RequireAuth = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

// Requiere usuario + hogar configurado.
const RequireHogar = ({ children }) => {
  const { user } = useAuth();
  const { hogar, loading } = useHogar();
  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <Pantalla><div className="spinner" /></Pantalla>;
  return hogar ? children : <Navigate to="/onboarding" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />

    <Route path="/onboarding" element={
      <RequireAuth><Onboarding /></RequireAuth>
    } />

    <Route path="/"           element={<RequireHogar><Home /></RequireHogar>} />
    <Route path="/gastos"     element={<RequireHogar><Gastos /></RequireHogar>} />
    <Route path="/tabla"      element={<RequireHogar><Tabla /></RequireHogar>} />
    <Route path="/tarjetas"   element={<Navigate to="/gastos" replace />} />
    <Route path="/categorias" element={<RequireHogar><Categorias /></RequireHogar>} />
    <Route path="/conceptos"  element={<RequireHogar><Conceptos /></RequireHogar>} />
    <Route path="/grupos"     element={<RequireHogar><Grupos /></RequireHogar>} />
    <Route path="/estructura" element={<Navigate to="/conceptos" replace />} />
    <Route path="/ajustes"    element={<RequireHogar><Ajustes /></RequireHogar>} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    <HogarProvider>
      <EstructuraProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </EstructuraProvider>
    </HogarProvider>
  </AuthProvider>
);

export default App;
