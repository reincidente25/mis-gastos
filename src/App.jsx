// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';

// Pages
import Login    from './pages/Login';
import Home     from './pages/Home';
// import Dashboard from './pages/Dashboard';  // ← agregar páginas acá

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Pública */}
          <Route path="/login" element={<Login />} />

          {/* Privadas */}
          <Route path="/" element={
            <PrivateRoute><Home /></PrivateRoute>
          } />

          {/* <Route path="/dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } /> */}

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
