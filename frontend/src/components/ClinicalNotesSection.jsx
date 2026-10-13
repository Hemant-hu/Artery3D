import React, { useState } from 'react';
import {
  FileText,
  PlusCircle,
  AlertCircle,
  Clock,
  UserCheck,
  Send,
  X,
  CheckCircle2,
  BookmarkCheck,
  Stethoscope,
  ShieldAlert
} from 'lucide-react';

const CLINICAL_TEMPLATES = [
  {
    title: 'Urgent Catheterization (<48h)',
    urgency: 'Urgent (<48h)',
    note: 'Patient presents with critical multi-vessel CAD risk and significant LAD/RCA stenosis projection. Clinical presentation and risk biomarker burden indicate imminent anterior wall ischemia.',
    action_plan: '1. Urgent referral for diagnostic coronary angiography / catheterization within 48h.\n2. Initiate Dual Antiplatelet Therapy (Aspirin 81mg + Clopidogrel 75mg daily).\n3. High-intensity Atorvastatin 80mg daily.\n4. Telemetry monitoring and cardiology follow-up in CCU.'
  },
  {
    title: 'Elective PCI / DES Stenting',
    urgency: 'Priority (1-2 wks)',
    note: 'Hemodynamic stenosis indicators suggest anatomically significant flow restriction in LAD. Patient suitable for elective percutaneous coronary intervention with fractional flow reserve (FFR) confirmation.',
    action_plan: '1. Schedule elective PCI with Drug-Eluting Stent (DES) deployment within 2 weeks.\n2. Pre-procedure renal function (eGFR/Cr) check for radiocontrast safety.\n3. Continue guideline-directed medical therapy (GDMT).'
  },
  {
    title: 'Conservative Medical Management',
    urgency: 'Routine',
    note: 'Stenosis probabilities remain sub-critical with preserved functional status. Invasive revascularization not indicated at current threshold.',
    action_plan: '1. Optimize lifestyle and cardiovascular risk factor modification (BP < 130/80, LDL < 70 mg/dL).\n2. Continue daily aspirin and moderate statin therapy.\n3. Outpatient treadmill stress echocardiogram and follow-up in 3 months.'
  }
];

export default function ClinicalNotesSection({
  patientId,
  notes = [],
  onAddNote,
  attendingDoctor = 'Dr. Attending Physician'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urgency, setUrgency] = useState('Urgent (<48h)');
  const [noteText, setNoteText] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleApplyTemplate = (tmpl) => {
    setUrgency(tmpl.urgency);
    setNoteText(tmpl.note);
    setActionPlan(tmpl.action_plan);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddNote({
        note: noteText.trim(),
        action_plan: actionPlan.trim() || null,
        urgency
      });

      setNoteText('');
      setActionPlan('');
      setIsOpen(false);
      setFeedbackMsg('Clinical consultation note appended & signed successfully!');
      setTimeout(() => setFeedbackMsg(''), 4500);
    } catch (err) {
      console.error(err);
      alert('Error saving note: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyBadge = (level) => {
    switch (level) {
      case 'Urgent (<48h)':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          border: 'rgba(239, 68, 68, 0.3)',
          icon: '🔴'
        };
      case 'Priority (1-2 wks)':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          color: '#d97706',
          border: 'rgba(245, 158, 11, 0.3)',
          icon: '🟡'
        };
      default:
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          color: '#059669',
          border: 'rgba(16, 185, 129, 0.3)',
          icon: '🟢'
        };
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0a4d3c, #0284c7)',
            padding: '8px',
            borderRadius: '10px',
            color: 'white',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Stethoscope size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Physician Clinical Notes & Action Plan
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Official consultation narrative, risk triage & therapeutic orders
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: isOpen ? '#f1f5f9' : 'linear-gradient(135deg, #0a4d3c, #0d6951)',
            color: isOpen ? '#475569' : '#ffffff',
            border: isOpen ? '1px solid #cbd5e1' : 'none',
            borderRadius: '10px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isOpen ? 'none' : '0 4px 12px rgba(10, 77, 60, 0.25)',
            transition: 'all 0.2s'
          }}
        >
          {isOpen ? <X size={16} /> : <PlusCircle size={16} />}
          <span>{isOpen ? 'Close Editor' : 'Write Clinical Note & Action Plan'}</span>
        </button>
      </div>

      {/* Success Notification */}
      {feedbackMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid #10b981',
          color: '#065f46',
          padding: '10px 16px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Form / Editor Modal Drawer */}
      {isOpen && (
        <form onSubmit={handleSubmit} style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={16} color="#0a4d3c" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Attending Evaluator: <strong style={{ color: '#0a4d3c' }}>{attendingDoctor}</strong>
              </span>
            </div>

            {/* Urgency Radio / Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Triage Urgency:</span>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                <option value="Urgent (<48h)">🔴 Urgent Cath / Inpatient (&lt;48h)</option>
                <option value="Priority (1-2 wks)">🟡 Priority PCI / Imaging (1-2 wks)</option>
                <option value="Routine">🟢 Routine Outpatient Follow-up</option>
              </select>
            </div>
          </div>

          {/* Quick Clinical Templates */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              ⚡ Quick Clinical Recommendation Templates:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CLINICAL_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  style={{
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 500,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0a4d3c'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  <BookmarkCheck size={12} color="#0a4d3c" />
                  <span>{tmpl.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Consultation Narrative */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Consultation Narrative & Assessment:
            </label>
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter official clinical narrative, symptom interpretation, and coronary lesion assessment..."
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Action Plan */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Prescribed Action Plan & Interventions:
            </label>
            <textarea
              rows={3}
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder="e.g. 1. Urgent cardiac catheterization within 48h&#10;2. Initiate Dual Antiplatelet Therapy (DAPT)&#10;3. High-dose Atorvastatin..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !noteText.trim()}
              style={{
                background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #0a4d3c, #0284c7)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 18px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Send size={13} />
              <span>{isSubmitting ? 'Signing & Saving...' : 'Sign & Append Note'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Notes Timeline List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {notes.length === 0 ? (
          <div style={{
            padding: '30px 20px',
            textAlign: 'center',
            color: '#64748b',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1'
          }}>
            <FileText size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
              No Consultation Notes Appended Yet
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Click <strong>"Write Clinical Note & Action Plan"</strong> above to record your expert clinical recommendations.
            </div>
          </div>
        ) : (
          notes.map((item, idx) => {
            const urgencyBadge = getUrgencyBadge(item.urgency);
            return (
              <div
                key={item.id || idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${urgencyBadge.color}`,
                  borderRadius: '12px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Note Meta Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>👨‍⚕️</span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                      {item.doctor_name || attendingDoctor}
                    </strong>
                    <span style={{
                      fontSize: '11px',
                      color: '#64748b',
                      background: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '999px'
                    }}>
                      Attending Cardiologist
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Urgency Badge */}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: urgencyBadge.bg,
                      color: urgencyBadge.color,
                      border: `1px solid ${urgencyBadge.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{urgencyBadge.icon}</span>
                      <span>{item.urgency || 'Routine'}</span>
                    </span>

                    {/* Timestamp */}
                    <span style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} />
                      <span>{item.timestamp}</span>
                    </span>
                  </div>
                </div>

                {/* Narrative */}
                <div style={{
                  fontSize: '13px',
                  color: '#334155',
                  lineHeight: 1.55,
                  background: '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9'
                }}>
                  {item.note}
                </div>

                {/* Action Plan */}
                {item.action_plan && (
                  <div style={{
                    fontSize: '12px',
                    color: '#065f46',
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    lineHeight: 1.55
                  }}>
                    <strong style={{ display: 'block', color: '#047857', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                      📋 Prescribed Clinical Action Plan & Orders:
                    </strong>
                    <div style={{ whiteSpace: 'pre-line' }}>
                      {item.action_plan}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
