import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { Link, useNavigate } from 'react-router-dom';

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://127.0.0.1:8000/patients', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      setPatients(Array.isArray(data) ? data : []);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [navigate]);

  return (
    <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ padding: '60px 5%', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px' }}>Patient Dashboard</h2>
          <Link to="/new-patient" className="btn-dark">+ Add New Patient</Link>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>
        ) : patients.length === 0 ? (
          <div style={{ background: 'white', padding: '60px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <img src="/assets/hero_heart.jpg" alt="No Patients" style={{ borderRadius: '50%', width: '150px', height: '150px', objectFit: 'cover', marginBottom: '20px' }} />
            <h3>No Patients Yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Start by adding a new patient to generate a 3D cardiovascular report.</p>
            <Link to="/new-patient" className="btn-dark" style={{ marginTop: '20px', display: 'inline-block' }}>+ Add New Patient</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {patients.map(p => (
              <div key={p.id} style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>{p.patient_name}</h3>
                <div style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Overall CAD Risk: <strong style={{ color: p.overall_risk > 0.5 ? 'red' : 'green' }}>{(p.overall_risk * 100).toFixed(1)}%</strong>
                </div>
                <Link to={`/report/${p.id}`} className="btn-outline" style={{ display: 'block', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>View Full Report</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
