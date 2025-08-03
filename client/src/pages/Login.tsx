import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spline from '@splinetool/react-spline';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!API_URL) {
      setError('API URL not set. Please configure REACT_APP_API_URL in your .env file.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        if (data.user && data.user.id) {
          localStorage.setItem('userId', data.user.id);
        }
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* Login Form Overlay */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 370, width: '100%', background: 'linear-gradient(120deg, #23263a 0%, #7c3aed 100%)', borderRadius: 20, padding: 40, boxShadow: '0 6px 32px rgba(44,62,80,0.18)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 auto', top: '50%', transform: 'translateY(25vh)' }}>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: 1, marginBottom: 24, color: '#7c3aed' }}>FinanceDash</div>
        <h2 style={{ textAlign: 'center', marginBottom: 24, fontWeight: 700 }}>Login</h2>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <label style={{ marginBottom: 8, fontSize: 16, fontWeight: 500, color: '#fff' }}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 16, padding: 8, fontSize: 16, fontWeight: 500, color: '#fff', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8 }}
          />
          <label style={{ marginBottom: 8, fontSize: 16, fontWeight: 500, color: '#fff' }}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 16, padding: 8, fontSize: 16, fontWeight: 500, color: '#fff', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8 }}
          />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 10, fontSize: 16, fontWeight: 700, color: '#fff', background: 'linear-gradient(120deg, #7c3aed 0%, #7c3aed 100%)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {error && <div style={{ color: 'red', marginTop: 16, fontSize: 16, fontWeight: 500 }}>{error}</div>}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span style={{ color: '#b0b8d1', fontSize: 15 }}>Don't have an account?</span>
          <br />
          <a href="/register" style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'underline', fontSize: 16, cursor: 'pointer' }}>
            Register
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
