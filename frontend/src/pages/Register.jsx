import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [doctorName, setDoctorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, full_name: doctorName.trim() })
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        navigate('/login', { state: { registeredName: doctorName, registeredEmail: email } });
      } else {
        setError(data.detail || 'Registration failed');
      }
    } catch (err) {
      setLoading(false);
      setError('Unable to reach backend server. Please verify the server is running.');
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-panel">
        <h2 style={{ marginBottom: '8px' }}>Register Doctor Account</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Create a physician profile to evaluate and manage cardiovascular patient records.
        </p>
        {error && <p className="error" style={{ marginBottom: '16px' }}>{error}</p>}
        <form onSubmit={handleRegister}>
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
            {loading ? 'Creating Doctor Profile...' : 'Complete Doctor Registration'}
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '14px', textAlign: 'center' }}>
          Already registered? <Link to="/login" style={{ fontWeight: '600' }}>Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
