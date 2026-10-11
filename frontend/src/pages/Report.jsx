import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import HeartModel from '../components/HeartModel';

function Report() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [data, setData] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState('');

  useEffect(() => {
    // If we already have the state from navigation, use it
    if (data && data.prediction) {
      setLoading(false);
      return;
    }

    // Otherwise, fetch it from the backend using the ID
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://127.0.0.1:8000/patients/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch patient report');
        }
        
        const result = await res.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Could not load report.');
        setLoading(false);
      }
    };

    if (id) {
      fetchReport();
    }
  }, [id, data]);

  if (loading) {
    return (
      <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ padding: '60px 5%', textAlign: 'center' }}><h2>Loading Report...</h2></div>
      </div>
    );
  }

  const SAMPLE_PATIENT = {
    patient_name: 'John Doe (Clinical Demonstration Case)',
    prediction: {
      overall_cad_risk: 0.892,
      stenosis_probabilities: {
        LAD: 0.814,
        LCX: 0.142,
        RCA: 0.778
      },
      shap_values: {
        'Typical Chest Pain': 0.28,
        'ST Elevation': 0.22,
        'Age': 0.19,
        'Region RWMA': 0.17,
        'EF-TTE': -0.15,
        'Current Smoker': 0.14,
        'FBS': 0.11,
        'TG': 0.09,
        'BMI': 0.08,
        'Dyslipidemia': 0.06
      }
    }
  };

  if (error || !data || !data.prediction) {
    return (
      <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ padding: '60px 5%', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '16px' }}>{error || 'No report data available.'}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
            To view patient records, please log in with your clinician account, or load the interactive clinical demonstration report below to explore the 3D heart model and coronary vessel tree.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setData(SAMPLE_PATIENT); setError(''); }}
              className="btn-dark"
              style={{ background: '#00b4d8', borderColor: '#00b4d8' }}
            >
              Explore Demo 3D Heart Report
            </button>
            <Link to="/login" className="btn-outline">Go to Login</Link>
            <Link to="/dashboard" className="btn-outline">Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const { prediction, patient_name } = data;
  const { overall_cad_risk, stenosis_probabilities, shap_values } = prediction;

  // Sort SHAP values by absolute impact
  const sortedShap = Object.entries(shap_values)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 10); // top 10 features

  return (
    <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-alt)' }}>
      <Navbar />
      <div style={{ padding: '40px 5%', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ fontSize: '32px', margin: '0' }}>Report: {patient_name}</h2>
            <p style={{ color: 'var(--text-muted)' }}>AI-Generated Cardiovascular Risk Analysis</p>
          </div>
          <button className="btn-outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>

        <div style={{ display: 'flex', gap: '30px' }}>
          {/* Left Column: Data & Metrics */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Overall Risk Card */}
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Overall CAD Risk</h3>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: overall_cad_risk > 0.5 ? '#d32f2f' : '#2e7d32' }}>
                {(overall_cad_risk * 100).toFixed(1)}%
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0' }}>
                {overall_cad_risk > 0.5 ? 'High probability of significant Coronary Artery Disease.' : 'Low probability of significant Coronary Artery Disease.'}
              </p>
            </div>

            {/* Vessel Stenosis Probabilities */}
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 20px 0' }}>Vessel Stenosis Probabilities</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {Object.entries(stenosis_probabilities).map(([vessel, prob]) => (
                  <div key={vessel}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong>{vessel}</strong>
                      <span style={{ color: prob > 0.5 ? '#d32f2f' : 'inherit' }}>{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${prob * 100}%`, height: '100%', background: prob > 0.5 ? '#d32f2f' : '#0a4d3c', transition: 'width 1s ease-in-out' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Contributing Factors (SHAP) */}
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 20px 0' }}>Top Contributing Factors (SHAP)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sortedShap.map(([feature, val]) => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <div style={{ width: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{feature}</div>
                    <div style={{ flex: 1, height: '20px', display: 'flex', alignItems: 'center' }}>
                      {/* 0 center line */}
                      <div style={{ width: '50%', borderRight: '1px solid #ccc', height: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                         {val < 0 && <div style={{ height: '8px', background: '#2196f3', width: `${Math.min(Math.abs(val)*100, 100)}%` }}></div>}
                      </div>
                      <div style={{ width: '50%', height: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                         {val > 0 && <div style={{ height: '8px', background: '#f44336', width: `${Math.min(val*100, 100)}%` }}></div>}
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999', marginTop: '5px' }}>
                  <span>Decreases Risk</span>
                  <span>Increases Risk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Visualization */}
          <div style={{ flex: 1.5, background: '#0a0f1a', borderRadius: '16px', overflow: 'hidden', position: 'relative', minHeight: '720px', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <HeartModel prediction={prediction} />
          </div>

        </div>
      </div>
    </div>
  );
}

export default Report;
