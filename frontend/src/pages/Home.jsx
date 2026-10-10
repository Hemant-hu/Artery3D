import React from 'react';
import { Link } from 'react-router-dom';

import Navbar from '../components/Navbar';

function Home() {
  return (
    <div className="home-container">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-subtitle">Trusted Doctor in Pulse Life</div>
          <h1 className="hero-title">Enjoy a Disease Free Life</h1>
          <p className="hero-desc">
            Experience our advanced predictive modeling integrated with stunning 3D anatomical visualization for cardiovascular health.
          </p>
          <Link to="/login" className="btn-dark">Explore Now</Link>
        </div>
        <div className="hero-image">
           {/* Placeholder for the large 3D heart rendering in hero */}
           <img src="/assets/hero_heart.jpg" alt="Heart" style={{borderRadius: '50%', width: '400px', height: '400px', objectFit: 'cover'}} />
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div style={{flex: 1}}>
          <img src="/assets/hospital_surgery.jpg" alt="About" style={{borderRadius: '50%', width: '300px', height: '300px', objectFit: 'cover'}} />
        </div>
        <div style={{flex: 1}}>
          <div className="hero-subtitle">About Hospital</div>
          <h2 style={{fontSize: '32px', margin: '10px 0 30px 0'}}>Welcome to Artery3D</h2>
          <div className="about-grid">
            <div className="about-card">
              <div><strong>Medical Treatment</strong><br/><span style={{fontSize: '12px', color: '#666'}}>Read more</span></div>
            </div>
            <div className="about-card">
              <div><strong>Emergency Help</strong><br/><span style={{fontSize: '12px', color: '#666'}}>Read more</span></div>
            </div>
            <div className="about-card">
              <div><strong>Pharmacy Life</strong><br/><span style={{fontSize: '12px', color: '#666'}}>Read more</span></div>
            </div>
            <div className="about-card">
              <div><strong>Medical Professionals</strong><br/><span style={{fontSize: '12px', color: '#666'}}>Read more</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <h2>Our Services</h2>
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

      {/* Green Stats Section */}
      <section className="green-section">
        <div className="stat-card">
          <h4>Cutting Edge Technology</h4>
          <button style={{background: 'white', color: '#0a4d3c', border: 'none', padding: '5px 15px', borderRadius: '15px'}}>Read More</button>
        </div>
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
          <img src="/assets/golden_heart.jpg" alt="Gold heart" style={{height: '200px', objectFit: 'cover', borderRadius: '16px'}} />
        </div>
        <div className="stat-card">
          <h4>Leadership Legacy</h4>
          <button style={{background: 'white', color: '#0a4d3c', border: 'none', padding: '5px 15px', borderRadius: '15px'}}>Read More</button>
        </div>
      </section>

      {/* Doctors Section */}
      <section className="doctors-section">
        <h2>Our Doctors Team</h2>
        <div className="doctors-grid">
          {[1,2,3,4].map(i => (
            <div className="doctor-card" key={i}>
              <img className="doctor-img" src={i % 2 === 0 ? "/assets/doctor1.jpg" : "/assets/doctor2.jpg"} style={{objectFit: 'cover'}} alt="Doctor" />
              <h4>Dr. Example Name</h4>
              <p style={{color: '#666', fontSize: '12px'}}>MD, PhD, FACC</p>
            </div>
          ))}
        </div>
        <button className="btn-dark" style={{marginTop: '30px'}}>View All Team</button>
      </section>
    </div>
  );
}

export default Home;
