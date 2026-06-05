import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api.js';
import Alert from '../components/Alert.jsx';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao efetuar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page login-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">🍽️</div>
            <h1>Sistema Gastronômico</h1>
            <p>Acesso ao painel de gestão</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="form-group password-field">
              <label htmlFor="password">Senha</label>
              <div className="password-field-input">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.35 13.58c.75-1.15 1.24-2.47 1.24-3.92 0-4.42-3.58-8-8-8-.88 0-1.73.15-2.54.42l1.89 1.89c.42-.07.85-.11 1.29-.11 3.31 0 6 2.69 6 6 0 .43-.04.87-.11 1.29l1.23 1.43zM2.89 3.12l2.28 2.28.46.46A11.804 11.804 0 001 9.66c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.41L21 20.49l1.89 1.5-2-2L4.89 5.12 3 3.61l2.89-.49zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Ainda não tem conta?{' '}
              <Link to="/register" className="auth-link">
                Cadastre-se aqui
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-info">
          <div className="info-box">
            <span className="info-icon">📋</span>
            <h3>Pedidos</h3>
            <p>Gerencie pedidos da sala</p>
          </div>
          <div className="info-box">
            <span className="info-icon">👨‍🍳</span>
            <h3>Cozinha</h3>
            <p>Acompanhe a produção</p>
          </div>
          <div className="info-box">
            <span className="info-icon">📦</span>
            <h3>Estoque</h3>
            <p>Controle de ingredientes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
