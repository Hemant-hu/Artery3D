import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

function NewPatient() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: 'John Doe',
    age: 53,
    sex: 'Male',
    clinical_data: {
      "Age": 53, "Weight": 90, "Length": 175, "Sex": "Male", "BMI": 29.38,
      "DM": 0, "HTN": 1, "Current Smoker": 1, "EX-Smoker": 0, "FH": 0, "Obesity": "Y",
      "CRF": "N", "CVA": "N", "Airway disease": "N", "Thyroid Disease": "N", "CHF": "N",
      "DLP": "Y", "BP": 110, "PR": 80, "Edema": 0, "Weak Peripheral Pulse": "N", "Lung rales": "N",
      "Systolic Murmur": "N", "Diastolic Murmur": "N", "Typical Chest Pain": 0, "Dyspnea": "N",
      "Function Class": 0, "Atypical": "N", "Nonanginal": "N", "Exertional CP": "N",
      "LowTH Ang": "N", "Q Wave": 0, "St Elevation": 0, "St Depression": 1, "Tinversion": 1,
      "LVH": "N", "Poor R Progression": "N", "BBB": "N", "FBS": 90, "CR": 0.7, "TG": 250,
      "LDL": 155, "HDL": 30.0, "BUN": 8, "ESR": 7, "HB": 15.6, "K": 4.7, "Na": 141,
      "WBC": 5700, "Lymph": 39, "Neut": 52, "PLT": 261, "EF-TTE": 50, "Region RWMA": 0, "VHD": "N"
    }
  });

  const handleBaseChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleClinicalChange = (e) => {
    const { name, value } = e.target;
    // Attempt to parse number
    const numValue = isNaN(Number(value)) || value.trim() === '' ? value : Number(value);
    setFormData({
      ...formData,
      clinical_data: { ...formData.clinical_data, [name]: numValue }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Sync Age and Sex to clinical data
      const payload = {
        patient_name: formData.patient_name,
        age: Number(formData.age),
        sex: formData.sex,
        clinical_data: {
          ...formData.clinical_data,
          Age: Number(formData.age),
          Sex: formData.sex
        }
      };

      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      setLoading(false);
      if (response.ok) {
        navigate(`/report/${result.patient_id}`, { state: { prediction: result, patient_name: formData.patient_name } });
      } else {
        alert("Prediction failed: " + JSON.stringify(result));
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
      setLoading(false);
    }
  };

  return (
    <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ padding: '60px 5%', flex: 1 }}>
        <h2 style={{ fontSize: '32px', marginBottom: '10px' }}>Add New Patient</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Enter patient clinical details to generate a 3D predictive analysis.</p>
        
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Basic Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Patient Name</label>
              <input type="text" name="patient_name" value={formData.patient_name} onChange={handleBaseChange} required />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Age</label>
              <input type="number" name="age" value={formData.age} onChange={handleBaseChange} required />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Sex (Male/Female/F/M)</label>
              <input type="text" name="sex" value={formData.sex} onChange={handleBaseChange} required />
            </div>
          </div>

          <h3 style={{ marginBottom: '20px', fontSize: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Clinical Parameters</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {Object.entries(formData.clinical_data).map(([key, value]) => {
              // skip Age and Sex since they are in basic info
              if (key === 'Age' || key === 'Sex') return null;
              return (
                <div key={key} className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)' }}>{key}</label>
                  <input 
                    type={typeof value === 'number' ? 'number' : 'text'} 
                    step={typeof value === 'number' ? 'any' : undefined} 
                    name={key} 
                    value={value} 
                    onChange={handleClinicalChange} 
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
                  />
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '40px', textAlign: 'right' }}>
            <button type="button" className="btn-outline" style={{ marginRight: '16px' }} onClick={() => navigate('/dashboard')}>Cancel</button>
            <button type="submit" className="btn-dark" disabled={loading}>
              {loading ? 'Analyzing...' : 'Generate 3D Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewPatient;
