import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import HeartModel from '../components/HeartModel';
import ClinicalNotesSection from '../components/ClinicalNotesSection';
import HospitalPdfReportModal from '../components/HospitalPdfReportModal';

const DEFAULT_CLINICAL = {
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
};

function Report() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [data, setData] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editForm, setEditForm] = useState({
    patient_name: '',
    age: 50,
    sex: 'Male',
    clinical_data: DEFAULT_CLINICAL
  });

  useEffect(() => {
    // If id is present, fetch authoritative DB record to guarantee 100% CAD risk synchronization with Dashboard
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
        if (!data) setError('Could not load report.');
        setLoading(false);
      }
    };

    if (id) {
      fetchReport();
    } else if (data && data.prediction) {
      setLoading(false);
    }
  }, [id]);

  const handleOpenEdit = () => {
    const existingClinical = (data && data.clinical_data) ? data.clinical_data : DEFAULT_CLINICAL;
    setEditForm({
      patient_name: (data && data.patient_name) || '',
      age: (data && data.age) || existingClinical.Age || 50,
      sex: (data && data.sex) || existingClinical.Sex || 'Male',
      clinical_data: { ...DEFAULT_CLINICAL, ...existingClinical }
    });
    setIsEditing(true);
  };

  const handleEditBasicChange = (e) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditClinicalChange = (e) => {
    const { name, value } = e.target;
    const numValue = isNaN(Number(value)) || value.trim() === '' ? value : Number(value);
    setEditForm(prev => ({
      ...prev,
      clinical_data: { ...prev.clinical_data, [name]: numValue }
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const targetId = id || (data && (data.id || data.patient_id));
      
      const payload = {
        patient_name: editForm.patient_name,
        age: Number(editForm.age),
        sex: editForm.sex,
        clinical_data: {
          ...editForm.clinical_data,
          Age: Number(editForm.age),
          Sex: editForm.sex
        }
      };

      if (!targetId) {
        setData(prev => ({
          ...prev,
          patient_name: editForm.patient_name,
          age: Number(editForm.age),
          sex: editForm.sex,
          clinical_data: editForm.clinical_data
        }));
        setIsEditing(false);
        setSaving(false);
        setEditSuccess('Demonstration case updated locally.');
        setTimeout(() => setEditSuccess(''), 5000);
        return;
      }

      const res = await fetch(`http://127.0.0.1:8000/patients/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to update patient record');
      }

      const result = await res.json();
      setData(result);
      setIsEditing(false);
      setSaving(false);
      setEditSuccess('Patient clinical record updated & CAD risk recalculated successfully!');
      setTimeout(() => setEditSuccess(''), 6000);
    } catch (err) {
      console.error(err);
      alert('Error updating patient: ' + err.message);
      setSaving(false);
    }
  };

  const handleAddClinicalNote = async (notePayload) => {
    const targetId = id || (data && (data.id || data.patient_id));
    const currentNotes = (data && data.clinical_notes) || [];
    const activeDoctor = (data?.doctor_name && (data.doctor_name.toLowerCase().startsWith('dr') ? data.doctor_name : `Dr. ${data.doctor_name}`)) || 'Dr. Attending Physician';

    if (!targetId) {
      // Demonstration case fallback
      const newLocalNote = {
        id: 'note-' + Date.now(),
        timestamp: new Date().toISOString(),
        doctor_name: activeDoctor,
        note: notePayload.note,
        action_plan: notePayload.action_plan,
        urgency: notePayload.urgency
      };
      setData(prev => ({
        ...prev,
        clinical_notes: [newLocalNote, ...currentNotes]
      }));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://127.0.0.1:8000/patients/${targetId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notePayload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to persist clinical note');
      }

      const savedNote = await res.json();
      setData(prev => ({
        ...prev,
        clinical_notes: [savedNote, ...currentNotes]
      }));
    } catch (err) {
      console.error(err);
      // Fallback locally
      const fallbackNote = {
        id: 'note-' + Date.now(),
        timestamp: new Date().toISOString(),
        doctor_name: activeDoctor,
        note: notePayload.note,
        action_plan: notePayload.action_plan,
        urgency: notePayload.urgency
      };
      setData(prev => ({
        ...prev,
        clinical_notes: [fallbackNote, ...currentNotes]
      }));
      alert('Note saved to local session. Server synchronization notice: ' + err.message);
    }
  };

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
    doctor_name: 'Dr. Clinical Specialist',
    overall_risk: 0.892,
    clinical_notes: [
      {
        id: 'sample-note-1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        doctor_name: 'Dr. Clinical Specialist',
        urgency: 'Urgent (<48h)',
        note: 'Patient presents with severe exertional angina, significant hemodynamic stenosis in LAD (81.4%) & RCA (77.8%), and acute ST-elevation markers indicating critical ischemia.',
        action_plan: '1. Recommended for urgent diagnostic coronary angiography and catheterization within 48h.\n2. Initiate Dual Antiplatelet Therapy (Aspirin 81mg + Clopidogrel 75mg daily).\n3. High-intensity Atorvastatin 80mg daily.\n4. Telemetry monitoring and CCU admission.'
      }
    ],
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

  // Authoritative CAD risk guaranteeing exact match with Patient Dashboard
  const riskValue = (data.overall_risk !== undefined) ? data.overall_risk : overall_cad_risk;

  const rawDoctorName =
    data?.doctor_name ||
    data?.prediction?.doctor_name ||
    (data === SAMPLE_PATIENT ? 'Dr. Clinical Specialist' : null);

  const displayDoctor = rawDoctorName
    ? (rawDoctorName.toLowerCase().startsWith('dr') ? rawDoctorName : `Dr. ${rawDoctorName}`)
    : 'Dr. Attending Physician';

  // Sort SHAP values by absolute impact
  const sortedShap = Object.entries(shap_values)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 10); // top 10 features

  return (
    <div className="home-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-alt)' }}>
      <Navbar />
      <div style={{ padding: '40px 5%', flex: 1 }}>
        {/* Success Alert Banner */}
        {editSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            color: '#065f46',
            padding: '14px 20px',
            borderRadius: '10px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 500,
            fontSize: '14px'
          }}>
            <span style={{ fontSize: '18px' }}>✅</span>
            <span>{editSuccess}</span>
          </div>
        )}

        {/* Header with Title and Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(10, 77, 60, 0.08)',
                color: '#0a4d3c',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid rgba(10, 77, 60, 0.25)'
              }}>
                <span>👨‍⚕️</span>
                <span>Attending Physician: {displayDoctor}</span>
              </span>
              <span style={{
                fontSize: '12px',
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '4px 10px',
                borderRadius: '12px',
                fontWeight: 500,
                border: '1px solid rgba(3, 105, 161, 0.2)'
              }}>
                Hospital-Wide Shared Registry
              </span>
            </div>
            <h2 style={{ fontSize: '32px', margin: '0 0 4px 0' }}>Report: {patient_name}</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
              AI-Generated Cardiovascular Risk Analysis &middot; Clinical entry evaluated by <strong>{displayDoctor}</strong>
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              id="generate-pdf-btn"
              onClick={() => setIsPdfModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0a4d3c 0%, #065f46 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(10, 77, 60, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              <span>📄</span>
              <span>Generate Hospital PDF</span>
            </button>
            <button
              className="btn-dark"
              onClick={handleOpenEdit}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>✏️</span>
              <span>Edit Patient Data</span>
            </button>
            <button className="btn-outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          {/* Left Column: Data & Metrics */}
          <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: '320px' }}>
            
            {/* Clinical Entry & Physician Attribution Card */}
            <div style={{
              background: 'white',
              padding: '20px 24px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              borderLeft: '4px solid #0a4d3c',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                  Evaluating Clinician
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                  {displayDoctor}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Cardiology Department &middot; Shared Registry Record
                </div>
              </div>
              <button
                onClick={handleOpenEdit}
                style={{
                  background: 'rgba(10, 77, 60, 0.08)',
                  border: '1px solid rgba(10, 77, 60, 0.25)',
                  color: '#0a4d3c',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>✏️</span>
                <span>Edit Case</span>
              </button>
            </div>

            {/* Overall Risk Card - Synchronized with Dashboard */}
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>Overall CAD Risk</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                  Synced with Registry
                </span>
              </div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: riskValue > 0.5 ? '#d32f2f' : '#2e7d32' }}>
                {(riskValue * 100).toFixed(1)}%
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0' }}>
                {riskValue > 0.5 ? 'High probability of significant Coronary Artery Disease.' : 'Low probability of significant Coronary Artery Disease.'}
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
          <div style={{ flex: '1.5 1 500px', background: '#0a0f1a', borderRadius: '16px', overflow: 'hidden', position: 'relative', minHeight: '720px', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <HeartModel prediction={{ ...prediction, overall_cad_risk: riskValue }} />
          </div>

        </div>

        {/* Physician Clinical Notes & Action Plan */}
        <div style={{ marginTop: '36px' }}>
          <ClinicalNotesSection
            patientId={id || data?.id || data?.patient_id}
            notes={data?.clinical_notes || []}
            onAddNote={handleAddClinicalNote}
            attendingDoctor={displayDoctor}
          />
        </div>
      </div>

      {/* Interactive Edit Patient Modal Dialog */}
      {isEditing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 30px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>
                  ✏️ Edit Patient Clinical Record
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Updating clinical parameters will automatically re-run the AI model and recalculate CAD risk & vessel stenosis.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '26px',
                  cursor: 'pointer',
                  color: '#64748b',
                  lineHeight: '1'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
              {/* Basic Info */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0a4d3c', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  Patient Demographics
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Patient Name
                    </label>
                    <input
                      type="text"
                      name="patient_name"
                      value={editForm.patient_name}
                      onChange={handleEditBasicChange}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Age
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={editForm.age}
                      onChange={handleEditBasicChange}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Sex
                    </label>
                    <select
                      name="sex"
                      value={editForm.sex}
                      onChange={handleEditBasicChange}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Clinical Parameters Grid */}
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0a4d3c', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  Clinical, Laboratory & Diagnostic Features
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px' }}>
                  {Object.entries(editForm.clinical_data).map(([key, val]) => {
                    if (key === 'Age' || key === 'Sex') return null;
                    return (
                      <div key={key} className="form-group">
                        <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: 500, marginBottom: '4px' }}>
                          {key}
                        </label>
                        <input
                          type={typeof val === 'number' ? 'number' : 'text'}
                          step={typeof val === 'number' ? 'any' : undefined}
                          name={key}
                          value={val}
                          onChange={handleEditClinicalChange}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-dark"
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {saving ? 'Recalculating AI Risk...' : '💾 Save & Recalculate Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Medical-Grade Hospital PDF Generation Modal */}
      <HospitalPdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        patientData={data}
        displayDoctor={displayDoctor}
      />
    </div>
  );
}

export default Report;
