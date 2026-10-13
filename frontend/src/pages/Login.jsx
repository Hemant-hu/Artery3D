import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

function Login() {
  const [doctorName, setDoctorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectMessage = location.state?.message;
  const redirectTarget = location.state?.from || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctor_name: doctorName.trim(),
          email: email.trim(),
          password: password
        })
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('doctor_name', data.doctor_name || doctorName);
        localStorage.setItem('doctor_email', data.email || email);
        localStorage.setItem('email', data.email || email);
        navigate(redirectTarget, { replace: true });
      } else {
        setError(data.detail || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      setLoading(false);
      setError('Unable to reach backend server. Please verify the server is running.');
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-panel">
        <div style={{ marginBottom: '16px' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Return to Hospital Home
          </Link>
        </div>

        <h2 style={{ marginBottom: '8px' }}>Doctor Portal Login</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          Enter your physician credentials to access patient data and clinical 3D records.
        </p>

        {redirectMessage && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            color: '#b45309',
            fontSize: '13px',
            lineHeight: '1.4',
            textAlign: 'left'
          }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>🔒</span>
            <div>
              <strong>Access Protected:</strong> {redirectMessage}
            </div>
          </div>
        )}

        {error && <p className="error" style={{ marginBottom: '16px' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Doctor Name
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Hemant Lad"
              required
              value={doctorName}
              onChange={e => setDoctorName(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="doctor@hospital.com"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button className="btn-predict" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Authenticating...' : 'Sign In to Clinical Portal'}
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '14px', textAlign: 'center' }}>
          New physician? <Link to="/register" style={{ fontWeight: '600' }}>Register doctor account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
