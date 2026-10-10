import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/login');
      } else {
        setError(data.detail || 'Registration failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-panel">
        <h2>Register Doctor Account</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn-predict" type="submit">Register</button>
        </form>
        <p>Already have an account? <Link to="/login">Login here</Link></p>
      </div>
    </div>
  );
}

export default Register;
