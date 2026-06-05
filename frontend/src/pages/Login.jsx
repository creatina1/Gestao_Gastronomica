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
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? '🙈' : '👁️'}
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
