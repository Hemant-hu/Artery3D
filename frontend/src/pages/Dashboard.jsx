import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

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

    fetch(`${API_BASE_URL}/patients`, {
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

  const currentDoctor = localStorage.getItem('doctor_name') || 'Doctor';

  return (
    <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ padding: '50px 5%', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '3px 10px', borderRadius: '999px', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                Active Physician: {currentDoctor}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hospital-Wide Shared Registry</span>
            </div>
            <h2 style={{ fontSize: '32px', margin: '0 0 6px 0' }}>Patient Records Dashboard</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
              Shared database of patient cardiovascular reports accessible to all medical staff.
            </p>
          </div>
          <Link to="/new-patient" className="btn-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            + Add New Patient Entry
          </Link>
        </div>

        {/* Clinical Decision Support Safety Disclaimer Banner */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.05)'
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
          <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.5', fontWeight: '500' }}>
            <strong>Clinical Decision Support Notice:</strong> Artery3D predictions are for clinical decision support and educational research only and are not a substitute for formal diagnostic coronary angiography or physician judgment.
          </div>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-muted)' }}>Loading shared patient records...</div>
        ) : patients.length === 0 ? (
          <div style={{ background: 'white', padding: '60px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <img src="/assets/hero_heart.jpg" alt="No Patients" style={{ borderRadius: '50%', width: '150px', height: '150px', objectFit: 'cover', marginBottom: '20px' }} />
            <h3>No Patients in Shared Registry Yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Enter patient clinical details to generate the first 3D cardiovascular assessment.</p>
            <Link to="/new-patient" className="btn-dark" style={{ marginTop: '20px', display: 'inline-block' }}>+ Add New Patient</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {patients.map(p => (
              <div key={p.id} style={{ background: 'white', padding: '24px', borderRadius: '14px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>{p.patient_name}</h3>
                    <span style={{ fontSize: '11px', color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>ID #{p.id}</span>
                  </div>
                  
                  {/* Attending / Entry Doctor Name */}
                  <div style={{ fontSize: '13px', color: '#0369a1', background: 'rgba(14, 165, 233, 0.08)', padding: '5px 10px', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <span>👨‍⚕️</span>
                    <span>Physician: <strong>{p.doctor_name || 'Medical Specialist'}</strong></span>
                  </div>

                  <div style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Overall CAD Risk: <strong style={{ color: p.overall_risk > 0.5 ? '#dc2626' : '#16a34a', fontSize: '16px' }}>{(p.overall_risk * 100).toFixed(1)}%</strong>
                  </div>
                </div>

                <Link to={`/report/${p.id}`} className="btn-outline" style={{ display: 'block', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                  View Full 3D Report
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
