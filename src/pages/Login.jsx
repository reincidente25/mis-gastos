// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const MENSAJES_ERROR = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/user-not-found': 'Email o contraseña incorrectos.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
};

const Login = () => {
  const { login, register } = useAuth();
  const navigate            = useNavigate();
  const [modo, setModo]     = useState('login'); // 'login' | 'registro'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const esRegistro = modo === 'registro';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (esRegistro) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(MENSAJES_ERROR[err.code] || 'Ocurrió un error. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const cambiarModo = () => {
    setModo(esRegistro ? 'login' : 'registro');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">💸</div>
        <h1 className="login-titulo">Mis Gastos</h1>
        <p className="login-subtitulo">
          {esRegistro ? 'Creá tu cuenta' : 'Ingresá a tu cuenta'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-grupo">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="form-grupo">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-login">
            {loading
              ? 'Procesando...'
              : esRegistro
              ? 'Crear cuenta'
              : 'Ingresar'}
          </button>
        </form>

        <p className="login-switch">
          {esRegistro ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
          <button type="button" className="login-switch-btn" onClick={cambiarModo}>
            {esRegistro ? 'Ingresá' : 'Registrate'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
