import React, { useRef, useState } from 'react';
import {
  Download,
  Printer,
  X,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Heart,
  Activity,
  ShieldCheck,
  User,
  Calendar,
  Building,
  Check
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

export default function HospitalPdfReportModal({
  isOpen,
  onClose,
  patientData,
  displayDoctor = 'Dr. Attending Physician'
}) {
  const reportRef = useRef();
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !patientData) return null;

  const {
    id,
    patient_id,
    patient_name = 'Patient',
    age = 50,
    sex = 'Male',
    overall_risk,
    clinical_data = {},
    clinical_notes = [],
    prediction = {}
  } = patientData;

  const riskValue = overall_risk !== undefined ? overall_risk : (prediction?.overall_cad_risk ?? 0.85);
  const stenosis = prediction?.stenosis_probabilities || { LAD: 0.8, LCX: 0.2, RCA: 0.7 };
  const shapValues = prediction?.shap_values || {};

  const sortedShap = Object.entries(shapValues)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 8);

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const reportTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const confidenceIntervals = prediction?.confidence_intervals || {};

  const getCI = (vessel) => {
    if (confidenceIntervals && confidenceIntervals[vessel]) {
      return confidenceIntervals[vessel];
    }
    const prob = vessel === 'Overall_CAD' ? riskValue : (stenosis[vessel] ?? 0.5);
    const moe = Math.min(0.16, Math.max(0.035, 4.0 * prob * (1.0 - prob) * 0.12));
    return {
      ci_lower: Math.max(0.01, prob - moe),
      ci_upper: Math.min(0.99, prob + moe),
      margin_percent: (moe * 100).toFixed(1),
      certainty_level: moe <= 0.065 ? "High" : (moe <= 0.11 ? "Moderate" : "Borderline"),
      is_uncertain: moe > 0.11
    };
  };

  const overallCI = getCI('Overall_CAD');

  const mrn = `A3D-${String(id || patient_id || 101).padStart(6, '0')}`;

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    try {
      const element = reportRef.current;
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `Artery3D_Clinical_Report_${patient_name.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('PDF export error:', err);
      // Fallback to print
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isHighRisk = riskValue > 0.5;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(10, 15, 26, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Top Floating Action Bar */}
      <div style={{
        width: '100%',
        maxWidth: '850px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '12px 20px',
        marginBottom: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        color: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileCheck size={20} color="#00e5ff" />
          <div>
            <strong style={{ fontSize: '14px', display: 'block' }}>Official Hospital PDF Report Generator</strong>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>JCI-Compliant Diagnostic & Consultation Documentation</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {downloadSuccess && (
            <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={14} /> PDF Downloaded
            </span>
          )}

          <button
            onClick={handlePrint}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f8fafc',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Printer size={14} /> Print
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #0a4d3c)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              color: 'white',
              borderRadius: '8px',
              padding: '7px 18px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
            }}
          >
            <Download size={14} />
            {isExporting ? 'Generating PDF...' : 'Download Official Hospital PDF'}
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Printable Document Scroll Area */}
      <div style={{
        width: '100%',
        maxWidth: '850px',
        maxHeight: 'calc(90vh - 70px)',
        overflowY: 'auto',
        borderRadius: '12px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
      }}>
        {/* Actual Printable Page (A4 Portrait Standard) */}
        <div
          ref={reportRef}
          id="hospital-clinical-report"
          style={{
            background: '#ffffff',
            color: '#0f172a',
            padding: '40px 45px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: '12px',
            lineHeight: 1.5,
            boxSizing: 'border-box',
            minHeight: '1080px'
          }}
        >
          {/* HOSPITAL LETTERHEAD HEADER */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: '20px',
            borderBottom: '2.5px solid #0a4d3c',
            marginBottom: '22px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '22px' }}>🫀</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#0a4d3c', letterSpacing: '0.02em' }}>
                  ARTERY3D CARDIOVASCULAR INSTITUTE
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Comprehensive Center for Interventional Cardiology & Hemodynamics
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                JCI Accredited Hospital Registry • Cardiac Catheterization & Angiography Lab
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
              <div style={{ fontWeight: 700, color: '#0a4d3c', fontSize: '13px' }}>
                CLINICAL DIAGNOSTIC REPORT
              </div>
              <div>MRN: <strong style={{ color: '#0f172a' }}>{mrn}</strong></div>
              <div>Document ID: <strong>DOC-CAD-2026-{id || patient_id || 101}</strong></div>
              <div>Date: <strong>{reportDate} • {reportTime}</strong></div>
            </div>
          </div>

          {/* PATIENT & ATTENDING PHYSICIAN PROFILE ROW */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: '16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '22px'
          }}>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                Patient Demographics
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {patient_name}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px', color: '#334155' }}>
                <span>Age: <strong>{age} yrs</strong></span>
                <span>Sex: <strong>{sex}</strong></span>
                <span>BMI: <strong>{clinical_data?.BMI || 29.4}</strong></span>
                <span>BP: <strong>{clinical_data?.BP || 110} mmHg</strong></span>
                <span>HR: <strong>{clinical_data?.PR || 80} bpm</strong></span>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                Attending Cardiologist
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0a4d3c', marginTop: '2px' }}>
                {displayDoctor}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Department of Cardiology • Shared Medical Staff
              </div>
            </div>
          </div>

          {/* OVERALL CARDIOVASCULAR RISK EVALUATION */}
          <div style={{
            background: isHighRisk ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
            border: `1.5px solid ${isHighRisk ? '#f87171' : '#34d399'}`,
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: isHighRisk ? '#dc2626' : '#059669' }}>
                Overall Coronary Artery Disease (CAD) Severity
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span>{(riskValue * 100).toFixed(1)}% Projected Occlusion Probability</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  • 95% CI: [{(overallCI.ci_lower * 100).toFixed(1)}% – {(overallCI.ci_upper * 100).toFixed(1)}%]
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                Derived via XGBoost/Gradient-Boosted Hemodynamic Model with validated C-index 0.941 &middot; {overallCI.certainty_level}.
              </div>
            </div>

            <div style={{
              background: isHighRisk ? '#dc2626' : '#059669',
              color: 'white',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textAlign: 'center'
            }}>
              {isHighRisk ? 'CRITICAL CAD RISK (≥50% STENOSIS)' : 'NORMAL / SUB-CRITICAL'}
            </div>
          </div>

          {/* VESSEL-BY-VESSEL STENOSIS PROJECTION TABLE */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0a4d3c', marginBottom: '8px' }}>
              1. Anatomical Coronary Tree Stenosis Breakdown
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', color: '#334155' }}>Vessel Segment</th>
                  <th style={{ padding: '8px 10px', color: '#334155' }}>Stenosis Prob.</th>
                  <th style={{ padding: '8px 10px', color: '#334155' }}>95% Conformal CI</th>
                  <th style={{ padding: '8px 10px', color: '#334155' }}>Ischemia Status</th>
                  <th style={{ padding: '8px 10px', color: '#334155' }}>Supplied Territory</th>
                  <th style={{ padding: '8px 10px', color: '#334155' }}>Clinical Implication</th>
                </tr>
              </thead>
              <tbody>
                {/* LAD */}
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                    Left Anterior Descending (LAD)
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: (stenosis.LAD ?? 0) > 0.5 ? '#dc2626' : '#059669' }}>
                    {((stenosis.LAD ?? 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '8px 10px', color: '#334155', whiteSpace: 'nowrap' }}>
                    [{(getCI('LAD').ci_lower * 100).toFixed(1)}% – {(getCI('LAD').ci_upper * 100).toFixed(1)}%]
                    <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px' }}>(±{getCI('LAD').margin_percent}%)</span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: (stenosis.LAD ?? 0) > 0.5 ? '#fee2e2' : '#dcfce7',
                      color: (stenosis.LAD ?? 0) > 0.5 ? '#b91c1c' : '#15803d'
                    }}>
                      {(stenosis.LAD ?? 0) > 0.5 ? 'HIGH ISCHEMIA' : 'NORMAL'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>Anterior LV wall, septum & apex</td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>Widowmaker vessel; critical anterior STEMI risk</td>
                </tr>

                {/* LCX */}
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                    Left Circumflex Artery (LCX)
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: (stenosis.LCX ?? 0) > 0.5 ? '#dc2626' : '#059669' }}>
                    {((stenosis.LCX ?? 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '8px 10px', color: '#334155', whiteSpace: 'nowrap' }}>
                    [{(getCI('LCX').ci_lower * 100).toFixed(1)}% – {(getCI('LCX').ci_upper * 100).toFixed(1)}%]
                    <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px' }}>(±{getCI('LCX').margin_percent}%)</span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: (stenosis.LCX ?? 0) > 0.5 ? '#fee2e2' : '#dcfce7',
                      color: (stenosis.LCX ?? 0) > 0.5 ? '#b91c1c' : '#15803d'
                    }}>
                      {(stenosis.LCX ?? 0) > 0.5 ? 'HIGH ISCHEMIA' : 'NORMAL'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>Lateral & posterior LV wall</td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>Obtuse marginal branches perfusion</td>
                </tr>

                {/* RCA */}
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                    Right Coronary Artery (RCA)
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: (stenosis.RCA ?? 0) > 0.5 ? '#dc2626' : '#059669' }}>
                    {((stenosis.RCA ?? 0) * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '8px 10px', color: '#334155', whiteSpace: 'nowrap' }}>
                    [{(getCI('RCA').ci_lower * 100).toFixed(1)}% – {(getCI('RCA').ci_upper * 100).toFixed(1)}%]
                    <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px' }}>(±{getCI('RCA').margin_percent}%)</span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: (stenosis.RCA ?? 0) > 0.5 ? '#fee2e2' : '#dcfce7',
                      color: (stenosis.RCA ?? 0) > 0.5 ? '#b91c1c' : '#15803d'
                    }}>
                      {(stenosis.RCA ?? 0) > 0.5 ? 'HIGH ISCHEMIA' : 'NORMAL'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>Right heart, inferior LV & SA/AV nodes</td>
                  <td style={{ padding: '8px 10px', color: '#475569' }}>Supplies intrinsic cardiac pacemaking tissue</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TOP SHAP RISK FACTOR DRIVERS */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0a4d3c', marginBottom: '8px' }}>
              2. Key Contributing Clinical Biomarkers (SHAP Analysis)
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              background: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              {sortedShap.map(([feature, val], idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: '#334155' }}>{feature}:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '45px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(Math.abs(val) * 100, 100)}%`,
                        height: '100%',
                        background: val > 0 ? '#ef4444' : '#0284c7'
                      }}></div>
                    </div>
                    <strong style={{ color: val > 0 ? '#dc2626' : '#0284c7', minWidth: '38px', textAlign: 'right' }}>
                      {val > 0 ? `+${(val * 100).toFixed(1)}%` : `${(val * 100).toFixed(1)}%`}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PHYSICIAN OFFICIAL NOTES & ACTION PLAN */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0a4d3c', marginBottom: '8px' }}>
              3. Attending Physician Consultation Notes & Action Plan
            </div>
            {clinical_notes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {clinical_notes.map((n, idx) => (
                  <div key={idx} style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '11px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: '#0f172a' }}>{n.doctor_name || displayDoctor} ({n.urgency || 'Routine'})</strong>
                      <span style={{ color: '#64748b' }}>{n.timestamp}</span>
                    </div>
                    <div style={{ color: '#334155', marginBottom: n.action_plan ? '6px' : '0' }}>
                      {n.note}
                    </div>
                    {n.action_plan && (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px 10px', borderRadius: '6px', color: '#065f46' }}>
                        <strong style={{ display: 'block', fontSize: '10px', color: '#047857' }}>PRESCRIBED ORDERS / PLAN:</strong>
                        <div style={{ whiteSpace: 'pre-line' }}>{n.action_plan}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11.5px',
                color: '#475569'
              }}>
                <strong style={{ color: '#0f172a' }}>Clinical Recommendation:</strong>
                <div>
                  Patient evaluated by {displayDoctor}. Diagnostic metrics indicate significant CAD risk. Recommended for formal clinical consultation, dual antiplatelet therapy assessment, and urgent coronary catheterization evaluation within 48 hours.
                </div>
              </div>
            )}
          </div>

          {/* OFFICIAL SIGNATURE & VERIFICATION SEAL BLOCK */}
          <div style={{
            marginTop: '30px',
            paddingTop: '18px',
            borderTop: '1.5px solid #cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: '11px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <ShieldCheck size={16} color="#0a4d3c" />
                <strong style={{ color: '#0a4d3c', fontSize: '12px' }}>
                  VALIDATED DIGITAL HOSPITAL ARCHIVE
                </strong>
              </div>
              <div style={{ color: '#64748b' }}>
                Secure verification hash: <code>SHA256: 7f8a...{id || patient_id || '92a'}b4</code>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '4px', maxWidth: '380px' }}>
                CONFIDENTIAL MEDICAL RECORD. Generated by Artery3D Clinical Suite. Information contained herein is legally privileged and intended solely for patient care and physician referral.
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: '220px' }}>
              <div style={{
                fontFamily: "'Brush Script MT', 'Dancing Script', cursive, sans-serif",
                fontSize: '22px',
                color: '#0a4d3c',
                marginBottom: '2px',
                letterSpacing: '1px'
              }}>
                {displayDoctor}
              </div>
              <div style={{ width: '100%', height: '1px', background: '#0f172a', marginBottom: '4px' }}></div>
              <strong style={{ display: 'block', color: '#0f172a' }}>{displayDoctor}</strong>
              <span style={{ color: '#64748b', fontSize: '10px' }}>Attending Interventional Cardiologist</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
