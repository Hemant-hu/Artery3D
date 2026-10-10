import React from 'react';
import Navbar from '../components/Navbar';

function Doctors() {
  return (
    <div className="home-container">
      <Navbar />
      <div style={{ padding: '60px 5%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '40px', marginBottom: '20px' }}>Meet Our Experts</h1>
        <p style={{ color: 'var(--text-muted)' }}>Top cardiologists and surgeons utilizing advanced 3D predictive modeling.</p>
        
        <div className="doctors-grid" style={{ marginTop: '60px' }}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div className="doctor-card" key={i}>
              <img className="doctor-img" src={i % 2 === 0 ? "/assets/doctor1.jpg" : "/assets/doctor2.jpg"} style={{objectFit: 'cover'}} alt="Doctor" />
              <h4>Dr. Example Name {i}</h4>
              <p style={{color: '#666', fontSize: '12px'}}>MD, PhD, FACC</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Doctors;
