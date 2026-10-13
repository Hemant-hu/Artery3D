import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const rawDoctorName = localStorage.getItem('doctor_name');
  const doctorDisplayName = rawDoctorName 
    ? (rawDoctorName.toLowerCase().startsWith('dr') ? rawDoctorName : `Dr. ${rawDoctorName}`)
    : 'Doctor';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('doctor_name');
    localStorage.removeItem('doctor_email');
    localStorage.removeItem('email');
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/"><span>Artery3D</span></Link>
      </div>
      <div className="nav-links">
        <Link to="/" style={{ color: location.pathname === '/' ? 'var(--accent-green)' : '' }}>Home</Link>
        <Link to="/doctors" style={{ color: location.pathname === '/doctors' ? 'var(--accent-green)' : '' }}>Doctors</Link>
        <Link to="/services" style={{ color: location.pathname === '/services' ? 'var(--accent-green)' : '' }}>Services</Link>
        <Link to="/about" style={{ color: location.pathname === '/about' ? 'var(--accent-green)' : '' }}>About Us</Link>
        <Link to="/contact" style={{ color: location.pathname === '/contact' ? 'var(--accent-green)' : '' }}>Contact Us</Link>
      </div>
      <div className="nav-auth" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {token ? (
          <>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(10, 77, 60, 0.08)',
              border: '1px solid rgba(10, 77, 60, 0.2)',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '13px',
              color: '#0a4d3c',
              fontWeight: '600'
            }}>
              <span>👨‍⚕️</span>
              <span>{doctorDisplayName}</span>
            </div>
            <Link to="/dashboard" className="btn-dark" style={{ marginRight: '6px' }}>Patient Dashboard</Link>
            <button onClick={handleLogout} className="btn-outline">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-outline" style={{ marginRight: '10px' }}>Doctor Login</Link>
            <Link to="/register" className="btn-dark">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;

