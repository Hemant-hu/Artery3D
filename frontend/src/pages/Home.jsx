import React from 'react';
import { Link } from 'react-router-dom';

import Navbar from '../components/Navbar';

function Home() {
  const token = localStorage.getItem('token');
  const rawDoctor = localStorage.getItem('doctor_name');
  const doctorName = rawDoctor 
    ? (rawDoctor.toLowerCase().startsWith('dr') ? rawDoctor : `Dr. ${rawDoctor}`)
    : 'Doctor';

  return (
    <div className="home-container">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-subtitle">Trusted Cardiology & Hemodynamics</div>
          <h1 className="hero-title">Enjoy a Disease Free Life</h1>
          <p className="hero-desc">
            Experience our advanced predictive modeling integrated with interactive 3D anatomical visualization for personalized cardiovascular health.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
            {token ? (
              <>
                <Link to="/dashboard" className="btn-dark">
                  Open Patient Dashboard ({doctorName})
                </Link>
                <Link to="/new-patient" className="btn-outline">
                  + New Patient Entry
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-dark">
                  Doctor Login • View Patient Data
                </Link>
                <Link to="/services" className="btn-outline">
                  Explore Hospital Services
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-image">
           <img 
             src="/assets/hero_heart.jpg" 
             alt="Heart" 
             style={{ borderRadius: '50%', width: '400px', height: '400px', objectFit: 'cover' }} 
           />
        </div>
      </section>

      {/* Protected Patient Data Notice Card */}
      <section style={{ padding: '0 5% 40px 5%' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px 36px',
          boxShadow: '0 10px 30px rgba(10, 77, 60, 0.08)',
          border: '1px solid rgba(10, 77, 60, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: token ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)', color: token ? '#059669' : '#b45309', fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>
              <span>{token ? '🔓 Authenticated Session' : '🔒 Clinician Access Restricted'}</span>
            </div>
            <h3 style={{ fontSize: '24px', color: '#0a4d3c', margin: '0 0 8px 0' }}>
              {token ? `Welcome back, ${doctorName}` : 'Patient Records & 3D Reports Require Doctor Login'}
            </h3>
            <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
              {token
                ? 'Your physician session is active. You have full clearance to review clinical records, 3D vessel trees, and 10-year MACE survival projections.'
                : 'In accordance with hospital clinical data protection, all patient angiographic diagnostics, LAD/LCX/RCA stenosis predictions, and longitudinal survival records are strictly gated behind authenticated clinician accounts.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {token ? (
              <Link to="/dashboard" className="btn-dark" style={{ whiteSpace: 'nowrap' }}>
                Go to Patient Registry →
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-dark" style={{ whiteSpace: 'nowrap' }}>
                  Doctor Sign In
                </Link>
                <Link to="/register" className="btn-outline" style={{ whiteSpace: 'nowrap' }}>
                  Register Account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <img src="/assets/hospital_surgery.jpg" alt="About" style={{ borderRadius: '50%', width: '300px', height: '300px', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="hero-subtitle">About Hospital</div>
          <h2 style={{ fontSize: '32px', margin: '10px 0 30px 0' }}>Welcome to Artery3D</h2>
          <div className="about-grid">
            <div className="about-card">
              <div><strong>Medical Treatment</strong><br/><span style={{ fontSize: '12px', color: '#666' }}>Read more</span></div>
            </div>
            <div className="about-card">
              <div><strong>Emergency Help</strong><br/><span style={{ fontSize: '12px', color: '#666' }}>Read more</span></div>
            </div>
            <div className="about-card">
              <div><strong>Pharmacy Life</strong><br/><span style={{ fontSize: '12px', color: '#666' }}>Read more</span></div>
            </div>
            <div className="about-card">
              <div><strong>Medical Professionals</strong><br/><span style={{ fontSize: '12px', color: '#666' }}>Read more</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <h2>Our Services</h2>
        <div className="service-item">
          <img className="service-image" src="/assets/service_surgery.jpg" style={{ objectFit: 'cover' }} alt="Heart Surgery" />
          <div className="service-content">
            <span style={{ fontSize: '40px', color: '#ccc', fontWeight: '100' }}>01</span>
            <h3>Heart Surgery</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Advanced predictive analytics mapped to personalized anatomical structures.</p>
            <Link to="/services" className="btn-dark" style={{ textDecoration: 'none', display: 'inline-block' }}>Read More</Link>
          </div>
        </div>
        <div className="service-item">
          <img className="service-image" src="/assets/service_valve.jpg" style={{ objectFit: 'cover' }} alt="Valve Diseases" />
          <div className="service-content">
            <span style={{ fontSize: '40px', color: '#ccc', fontWeight: '100' }}>02</span>
            <h3>Valve Diseases</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Specialized predictive modules analyzing overall CAD status.</p>
            <Link to="/services" className="btn-dark" style={{ textDecoration: 'none', display: 'inline-block' }}>Read More</Link>
          </div>
        </div>
        <div className="service-item">
          <img className="service-image" src="/assets/service_ccu.jpg" style={{ objectFit: 'cover' }} alt="Cardiac Care Units" />
          <div className="service-content">
            <span style={{ fontSize: '40px', color: '#ccc', fontWeight: '100' }}>03</span>
            <h3>Cardiac Care Units</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>Continuous risk tracking and analysis.</p>
            <Link to="/services" className="btn-dark" style={{ textDecoration: 'none', display: 'inline-block' }}>Read More</Link>
          </div>
        </div>
      </section>

      {/* Green Stats Section */}
      <section className="green-section">
        <div className="stat-card">
          <h4>Cutting Edge Technology</h4>
          <Link to="/about" style={{ background: 'white', color: '#0a4d3c', border: 'none', padding: '5px 15px', borderRadius: '15px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', display: 'inline-block' }}>Read More</Link>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <img src="/assets/golden_heart.jpg" alt="Gold heart" style={{ height: '200px', objectFit: 'cover', borderRadius: '16px' }} />
        </div>
        <div className="stat-card">
          <h4>Leadership Legacy</h4>
          <Link to="/about" style={{ background: 'white', color: '#0a4d3c', border: 'none', padding: '5px 15px', borderRadius: '15px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', display: 'inline-block' }}>Read More</Link>
        </div>
      </section>

      {/* Doctors Section */}
      <section className="doctors-section">
        <h2>Our Doctors Team</h2>
        <div className="doctors-grid">
          {[1,2,3,4].map(i => (
            <div className="doctor-card" key={i}>
              <img className="doctor-img" src={i % 2 === 0 ? "/assets/doctor1.jpg" : "/assets/doctor2.jpg"} style={{ objectFit: 'cover' }} alt="Doctor" />
              <h4>Dr. Specialist {i}</h4>
              <p style={{ color: '#666', fontSize: '12px' }}>MD, PhD, Cardiology</p>
            </div>
          ))}
        </div>
        <Link to="/doctors" className="btn-dark" style={{ marginTop: '30px', textDecoration: 'none', display: 'inline-block' }}>View All Team</Link>
      </section>
    </div>
  );
}

export default Home;
