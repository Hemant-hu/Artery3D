import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';

function HeartPlaceholder() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#ef4444" wireframe />
    </mesh>
  );
}

function Dashboard() {
  const [predictions, setPredictions] = useState(null);
  const [patientName, setPatientName] = useState('John Doe');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  const handlePredict = async () => {
    const mockPatient = {
      "Age": 53, "Weight": 90, "Length": 175, "Sex": "Male", "BMI": 29.4, "DM": 0, "HTN": 1,
      "Current Smoker": 1, "EX-Smoker": 0, "FH": 0, "Obesity": "Y", "CRF": "N", "CVA": "N",
      "Airway disease": "N", "Thyroid Disease": "N", "CHF": "N", "DLP": "Y", "BP": 110, "PR": 80,
      "Edema": 0, "Weak Peripheral Pulse": "N", "Lung rales": "N", "Systolic Murmur": "N",
      "Diastolic Murmur": "N", "Typical Chest Pain": 0, "Dyspnea": "N", "Function Class": 0,
      "Atypical": "N", "Nonanginal": "N", "Exertional CP": "N", "LowTH Ang": "N", "Q Wave": 0,
      "St Elevation": 0, "St Depression": 1, "Tinversion": 1, "LVH": "N", "Poor R Progression": "N",
      "BBB": "N", "FBS": 90, "CR": 0.7, "TG": 250, "LDL": 155, "HDL": 30.0, "BUN": 8, "ESR": 7,
      "HB": 15.6, "K": 4.7, "Na": 141, "WBC": 5700, "Lymph": 39, "Neut": 52, "PLT": 261,
      "EF-TTE": 50, "Region RWMA": 0, "VHD": "N"
    };

    const payload = {
      patient_name: patientName,
      age: 53,
      sex: "Male",
      clinical_data: mockPatient
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if(res.status === 401) {
        navigate('/login');
        return;
      }
      const data = await res.json();
      setPredictions(data);
    } catch (err) {
      console.error("Error predicting:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <div className="app-container">
      {/* 3D Canvas Pane */}
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <HeartPlaceholder />
          <OrbitControls />
          <Environment preset="city" />
        </Canvas>
      </div>

      {/* Dashboard Pane */}
      <div className="dashboard-container glass-panel">
        <div className="header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h1>Artery3D Dashboard</h1>
            <p>Cardiovascular Risk Visualization & Prediction</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>

        <div className="disclaimer">
          <strong>⚠️ Clinical Safety Disclaimer:</strong> This tool is for decision support and educational purposes only.
        </div>

        <div className="form-group" style={{marginTop: '20px'}}>
          <label>Patient Name (Mock)</label>
          <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} />
        </div>

        <button className="btn-predict" onClick={handlePredict}>
          Run Prediction Analysis
        </button>

        {predictions && (
          <div className="results-section">
            <h2>Analysis Results</h2>
            <p><strong>Overall CAD Risk:</strong> {(predictions.overall_cad_risk * 100).toFixed(1)}%</p>
            
            <h3>Vessel Stenosis Probabilities</h3>
            <ul>
              <li><strong>LAD:</strong> {(predictions.stenosis_probabilities.LAD * 100).toFixed(1)}%</li>
              <li><strong>LCX:</strong> {(predictions.stenosis_probabilities.LCX * 100).toFixed(1)}%</li>
              <li><strong>RCA:</strong> {(predictions.stenosis_probabilities.RCA * 100).toFixed(1)}%</li>
            </ul>

            <h3>Top Risk Factors (SHAP)</h3>
            <ul>
              {Object.entries(predictions.shap_values)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .slice(0, 5)
                .map(([feat, val]) => (
                  <li key={feat}>{feat}: {val > 0 ? '+' : ''}{val.toFixed(3)}</li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
