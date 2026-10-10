import React from 'react';
import Navbar from '../components/Navbar';

function Services() {
  return (
    <div className="home-container">
      <Navbar />
      <div style={{ padding: '60px 5%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '40px', marginBottom: '20px' }}>Our Services</h1>
        <p style={{ color: 'var(--text-muted)' }}>Comprehensive cardiovascular care backed by AI.</p>
      </div>
      
      <section className="services-section" style={{ paddingTop: '20px' }}>
        <div className="service-item">
          <img className="service-image" src="/assets/service_surgery.jpg" style={{objectFit: 'cover'}} alt="Heart Surgery" />
          <div className="service-content">
            <span style={{fontSize: '40px', color: '#ccc', fontWeight: '100'}}>01</span>
            <h3>Heart Surgery</h3>
            <p style={{color: '#666', fontSize: '14px'}}>Advanced predictive analytics mapped to personalized anatomical structures.</p>
            <button className="btn-dark">Read More</button>
          </div>
        </div>
        <div className="service-item">
          <img className="service-image" src="/assets/service_valve.jpg" style={{objectFit: 'cover'}} alt="Valve Diseases" />
          <div className="service-content">
            <span style={{fontSize: '40px', color: '#ccc', fontWeight: '100'}}>02</span>
            <h3>Valve Diseases</h3>
            <p style={{color: '#666', fontSize: '14px'}}>Specialized predictive modules analyzing overall CAD status.</p>
            <button className="btn-dark">Read More</button>
          </div>
        </div>
        <div className="service-item">
          <img className="service-image" src="/assets/service_ccu.jpg" style={{objectFit: 'cover'}} alt="Cardiac Care Units" />
          <div className="service-content">
            <span style={{fontSize: '40px', color: '#ccc', fontWeight: '100'}}>03</span>
            <h3>Cardiac Care Units</h3>
            <p style={{color: '#666', fontSize: '14px'}}>Continuous risk tracking and analysis.</p>
            <button className="btn-dark">Read More</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Services;
