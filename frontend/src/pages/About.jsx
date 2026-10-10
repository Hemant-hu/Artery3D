import React from 'react';
import Navbar from '../components/Navbar';

function About() {
  return (
    <div className="home-container">
      <Navbar />
      <div style={{ padding: '60px 5%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '40px', marginBottom: '20px' }}>About Artery3D</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
          Artery3D was developed to bridge the gap between abstract machine learning percentages and intuitive clinical decision-making. 
          By combining a state-of-the-art diagnostic pipeline trained on the robust Z-Alizadeh Sani cardiovascular dataset with 
          stunning WebGL 3D anatomical modeling, we aim to provide doctors and patients a literal window into their cardiovascular health.
        </p>
      </div>

      <section className="about-section" style={{ marginTop: '40px' }}>
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
          <img src="/assets/hospital_surgery.jpg" alt="Lab" style={{borderRadius: '50%', width: '300px', height: '300px', objectFit: 'cover'}} />
        </div>
        <div style={{flex: 1}}>
          <div className="hero-subtitle">Our Mission</div>
          <h2 style={{fontSize: '32px', margin: '10px 0 30px 0'}}>Pioneering the Future of Cardiology</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            We believe that every patient deserves to fully understand their diagnosis. By visually mapping stenosis risk directly onto 
            the LAD, LCX, and RCA vessel nodes, physicians can communicate complex conditions effortlessly.
          </p>
        </div>
      </section>
    </div>
  );
}

export default About;
