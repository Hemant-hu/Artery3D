import React from 'react';
import Navbar from '../components/Navbar';

function Contact() {
  return (
    <div className="home-container">
      <Navbar />
      <div style={{ padding: '60px 5%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '40px', marginBottom: '20px' }}>Contact Us</h1>
        <p style={{ color: 'var(--text-muted)' }}>Get in touch with our support and medical liaison team.</p>
        
        <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'center' }}>
          <form style={{ width: '100%', maxWidth: '500px', textAlign: 'left', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Name</label>
              <input type="text" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Email</label>
              <input type="email" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Message</label>
              <textarea style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '100px', fontFamily: 'inherit' }}></textarea>
            </div>
            <button type="button" className="btn-dark" style={{ width: '100%' }}>Send Message</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Contact;
