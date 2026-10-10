import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();

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
      <div className="nav-auth">
        {localStorage.getItem('token') ? (
          <>
            <Link to="/dashboard" className="btn-dark" style={{marginRight: '10px'}}>Patient Dashboard</Link>
            <button onClick={() => { localStorage.removeItem('token'); window.location.href='/'; }} className="btn-outline">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-outline" style={{marginRight: '10px'}}>Login</Link>
            <Link to="/register" className="btn-dark">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
