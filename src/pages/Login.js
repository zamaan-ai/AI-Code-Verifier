import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader } from 'lucide-react';
import { login } from '../services/api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page login-shell">
      <section className="hero">
        <div className="hero__frame">
          <div className="hero__glow" aria-hidden="true" />
          <div className="hero__scrim" />

          <div className="hero__top-right">
            <div className="login-chip">
              <span className="trust-dot" />
              Offline · No Telemetry
            </div>
          </div>

          <div className="hero__copy">
            <div className="login-kicker">Air-Gapped AI</div>
            <h1>Code Verifier</h1>
            <p>Static analysis, findings, and compliance — fully offline.</p>
          </div>

          <div className="hero__bottom-left">
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-brand">
                <Shield size={22} />
                <div>
                  <div className="brand-title">Sign in</div>
                  <div className="brand-sub">Default: admin / admin123</div>
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <div className="login-error">{error}</div>}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader size={16} className="spin" /> : null}
                {loading ? ' Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
