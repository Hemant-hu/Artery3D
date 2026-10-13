import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  RotateCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Shield,
  Layers,
  ChevronRight,
  Droplets,
  Heart
} from 'lucide-react';

export default function IntravascularLabModal({
  isOpen,
  onClose,
  initialVessel = 'LAD',
  prediction = {},
  stentedVessels = [],
  onToggleStent = () => {}
}) {
  const [selectedVessel, setSelectedVessel] = useState(initialVessel);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(0);

  // Sync initial vessel when opened
  useEffect(() => {
    if (initialVessel && ['LAD', 'LCX', 'RCA'].includes(initialVessel)) {
      setSelectedVessel(initialVessel);
    }
  }, [initialVessel, isOpen]);

  if (!isOpen) return null;

  // Real-time risk probabilities from prediction
  const risks = {
    LAD: prediction?.stenosis_probabilities?.LAD ?? 0.814,
    LCX: prediction?.stenosis_probabilities?.LCX ?? 0.142,
    RCA: prediction?.stenosis_probabilities?.RCA ?? 0.778
  };

  const isCurrentStented = stentedVessels.includes(selectedVessel);
  const baselineRisk = risks[selectedVessel] ?? 0.5;
  const currentRisk = isCurrentStented ? 0.045 : baselineRisk;

  // Hemodynamic calculations
  const ffr = isCurrentStented
    ? 0.97
    : Math.max(0.62, Number((1.0 - baselineRisk * 0.42).toFixed(2)));
  const mla = isCurrentStented
    ? 11.8
    : Math.max(1.4, Number(((1.0 - baselineRisk) * 12.0).toFixed(1)));
  const perfusionPressure = isCurrentStented
    ? 88
    : Math.max(42, Math.round(88 - baselineRisk * 48));

  const vesselDetails = {
    LAD: {
      name: 'Left Anterior Descending Artery (LAD)',
      branch: 'Anterior Interventricular Branch',
      location: 'Mid-LAD Bifurcation (Segment 7)',
      vesselDiameter: '3.5 mm',
      stentRecommendation: 'Everolimus-Eluting Stent (EES) 3.5 × 18 mm',
      territory: 'Anterior left ventricular myocardium, septum, cardiac apex',
      dangerLevel: baselineRisk > 0.5 ? 'CRITICAL LESION' : 'MILD / NON-OBSTRUCTIVE'
    },
    LCX: {
      name: 'Left Circumflex Artery (LCX)',
      branch: 'Left Circumflex & Obtuse Marginal (OM1)',
      location: 'Proximal LCX Sulcus (Segment 11)',
      vesselDiameter: '3.0 mm',
      stentRecommendation: 'Zotarolimus-Eluting Stent (ZES) 3.0 × 15 mm',
      territory: 'Posterolateral left ventricular free wall & obtuse margin',
      dangerLevel: baselineRisk > 0.5 ? 'HIGH ISCHEMIC RISK' : 'LOW RISK'
    },
    RCA: {
      name: 'Right Coronary Artery (RCA)',
      branch: 'Main Right Coronary Trunk (RCA)',
      location: 'Mid-RCA / Acute Marginal (Segment 2)',
      vesselDiameter: '3.75 mm',
      stentRecommendation: 'Everolimus-Eluting Stent (EES) 3.5 × 22 mm',
      territory: 'Right atrium, right ventricle, inferior LV wall, AV nodal branch',
      dangerLevel: baselineRisk > 0.5 ? 'SIGNIFICANT STENOSIS' : 'NORMAL / PATENT'
    }
  };

  const currentInfo = vesselDetails[selectedVessel];

  // Procedural Stent Deployment Animation Trigger
  const handleDeployStent = () => {
    setIsDeploying(true);
    setDeploymentStep(1);

    setTimeout(() => setDeploymentStep(2), 600);
    setTimeout(() => setDeploymentStep(3), 1300);
    setTimeout(() => {
      setDeploymentStep(4);
      onToggleStent(selectedVessel, true);
      setIsDeploying(false);
    }, 2100);
  };

  const handleRemoveStent = () => {
    onToggleStent(selectedVessel, false);
    setDeploymentStep(0);
  };

  // Cross-section rendering geometry based on stenosis degree
  // SVG center = (150, 150), Outer Wall radius = 110, Lumen base radius = 85
  const lumenRadius = isCurrentStented
    ? 82
    : Math.max(22, Math.round(85 * (1.0 - baselineRisk * 0.72)));
  const plaqueThickness = 85 - lumenRadius;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(16px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0f172a 0%, #090d16 100%)',
        border: '1px solid rgba(0, 180, 216, 0.25)',
        borderRadius: '24px',
        maxWidth: '1080px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 180, 216, 0.15)',
        overflow: 'hidden'
      }}>
        {/* TOP BAR / HEADER */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.95)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(0, 180, 216, 0.15)',
              border: '1px solid rgba(0, 180, 216, 0.4)',
              borderRadius: '12px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={22} color="#00b4d8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                  Intravascular Plaque & Coronary Stenting Lab (IVUS)
                </h3>
                <span style={{
                  fontSize: '11px',
                  background: isCurrentStented ? 'rgba(16, 185, 129, 0.2)' : (baselineRisk > 0.5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)'),
                  color: isCurrentStented ? '#34d399' : (baselineRisk > 0.5 ? '#f87171' : '#38bdf8'),
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontWeight: 700,
                  border: `1px solid ${isCurrentStented ? 'rgba(16, 185, 129, 0.4)' : (baselineRisk > 0.5 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.3)')}`
                }}>
                  {isCurrentStented ? 'DRUG-ELUTING STENT ACTIVE (100% PATENT)' : currentInfo.dangerLevel}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Virtual Angioplasty (PCI) Simulation &middot; Cross-Sectional Hemodynamic & Plaque Morphology
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#cbd5e1',
              fontSize: '20px',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* VESSEL SELECTION TABS */}
        <div style={{
          padding: '12px 28px',
          background: 'rgba(10, 15, 26, 0.7)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '6px' }}>
            Select Target Vessel:
          </span>

          {['LAD', 'LCX', 'RCA'].map(vesselKey => {
            const isVesselStented = stentedVessels.includes(vesselKey);
            const vRisk = risks[vesselKey] ?? 0;
            const isSelected = selectedVessel === vesselKey;

            return (
              <button
                key={vesselKey}
                onClick={() => setSelectedVessel(vesselKey)}
                style={{
                  background: isSelected
                    ? (isVesselStented ? 'rgba(16, 185, 129, 0.25)' : (vRisk > 0.5 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 180, 216, 0.25)'))
                    : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${isSelected
                    ? (isVesselStented ? '#10b981' : (vRisk > 0.5 ? '#ef4444' : '#00b4d8'))
                    : 'rgba(255, 255, 255, 0.1)'}`,
                  color: isSelected ? '#f8fafc' : '#94a3b8',
                  padding: '7px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isVesselStented ? '#10b981' : (vRisk > 0.5 ? '#ef4444' : '#38bdf8'),
                  boxShadow: `0 0 8px ${isVesselStented ? '#10b981' : (vRisk > 0.5 ? '#ef4444' : '#38bdf8')}`
                }}></span>
                <span>{vesselKey}</span>
                <span style={{ fontSize: '11px', opacity: 0.85 }}>
                  {isVesselStented ? '(Stented)' : `${(vRisk * 100).toFixed(0)}%`}
                </span>
              </button>
            );
          })}
        </div>

        {/* MODAL MAIN CONTENT */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px',
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 420px) 1fr',
          gap: '28px'
        }}>
          {/* LEFT COLUMN: Intravascular Cross-Section SVG Rendering */}
          <div style={{
            background: 'rgba(10, 15, 26, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#00b4d8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Arterial Cross-Section (3.5 mm)
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Zoom: 45x Intravascular
              </span>
            </div>

            {/* Interactive SVG Artery Cross-Section */}
            <div style={{ position: 'relative', width: '300px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="300" height="300" viewBox="0 0 300 300">
                <defs>
                  {/* Outer Wall Gradient (Tunica Adventitia & Media) */}
                  <radialGradient id="adventitiaGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="60%" stopColor="#450a0a" />
                    <stop offset="85%" stopColor="#7f1d1d" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </radialGradient>

                  {/* Tunica Media Smooth Muscle */}
                  <radialGradient id="mediaGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="70%" stopColor="#1e293b" />
                    <stop offset="90%" stopColor="#881337" />
                    <stop offset="100%" stopColor="#9f1239" />
                  </radialGradient>

                  {/* Atheroma Lipid Core Gradient */}
                  <radialGradient id="plaqueGrad" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="45%" stopColor="#eab308" />
                    <stop offset="85%" stopColor="#ca8a04" />
                    <stop offset="100%" stopColor="#854d0e" />
                  </radialGradient>

                  {/* Healthy Blood Flow Stream Gradient */}
                  <radialGradient id="bloodFlowGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={isCurrentStented ? '#ef4444' : (baselineRisk > 0.5 ? '#b91c1c' : '#dc2626')} />
                    <stop offset="65%" stopColor={isCurrentStented ? '#dc2626' : (baselineRisk > 0.5 ? '#991b1b' : '#b91c1c')} />
                    <stop offset="100%" stopColor="#7f1d1d" />
                  </radialGradient>

                  {/* Metallic Stent Strut Pattern */}
                  <pattern id="stentMesh" width="16" height="16" patternUnits="userSpaceOnUse">
                    <path d="M 0 8 L 8 0 L 16 8 L 8 16 Z" fill="none" stroke="#00e5ff" strokeWidth="1.2" strokeOpacity="0.75" />
                    <circle cx="8" cy="8" r="1.5" fill="#38bdf8" />
                  </pattern>
                </defs>

                {/* 1. Outer Vessel Wall (Tunica Adventitia) */}
                <circle cx="150" cy="150" r="128" fill="url(#adventitiaGrad)" stroke="#b91c1c" strokeWidth="2.5" />

                {/* 2. Middle Layer (Tunica Media - Smooth Muscle) */}
                <circle cx="150" cy="150" r="112" fill="url(#mediaGrad)" stroke="#f43f5e" strokeWidth="1.5" opacity="0.9" />

                {/* 3. Intimal Boundary */}
                <circle cx="150" cy="150" r="96" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="3 2" />

                {/* 4. Atheroma Plaque (Compressed if stented, Obstructing if unstented) */}
                {!isCurrentStented && baselineRisk > 0.15 ? (
                  <g>
                    {/* Asymmetric Atherosclerotic Crescent Plaque */}
                    <path
                      d={`M ${150 - 92} 150 
                          A 92 92 0 0 1 ${150 + 92} 150 
                          Q 150 ${150 + (plaqueThickness * 1.55)} ${150 - 92} 150 Z`}
                      fill="url(#plaqueGrad)"
                      stroke="#eab308"
                      strokeWidth="1.5"
                    />
                    {/* Fibrous Cap (Superficial endothelial barrier) */}
                    <path
                      d={`M ${150 - 88} 150 
                          Q 150 ${150 + (plaqueThickness * 1.55)} ${150 + 88} 150`}
                      fill="none"
                      stroke="#fde047"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    {/* Calcification Micro-nodules */}
                    <circle cx="130" cy={150 + plaqueThickness * 0.55} r="3.5" fill="#ffffff" stroke="#94a3b8" />
                    <circle cx="170" cy={150 + plaqueThickness * 0.45} r="4.2" fill="#ffffff" stroke="#94a3b8" />
                    <circle cx="150" cy={150 + plaqueThickness * 0.8} r="2.8" fill="#ffffff" stroke="#94a3b8" />
                  </g>
                ) : null}

                {/* Plaque compressed thin behind deployed stent */}
                {isCurrentStented && (
                  <g opacity="0.4">
                    <circle cx="150" cy="150" r="92" fill="none" stroke="#ca8a04" strokeWidth="8" strokeDasharray="6 4" />
                  </g>
                )}

                {/* 5. Central Open Blood Flow Lumen */}
                <circle
                  cx="150"
                  cy={isCurrentStented ? 150 : (150 - (baselineRisk > 0.4 ? plaqueThickness * 0.4 : 0))}
                  r={lumenRadius}
                  fill="url(#bloodFlowGrad)"
                  stroke={isCurrentStented ? '#00e5ff' : '#ef4444'}
                  strokeWidth="2"
                  style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />

                {/* Pulsing blood flow streamlines in lumen center */}
                <circle
                  cx="150"
                  cy={isCurrentStented ? 150 : (150 - (baselineRisk > 0.4 ? plaqueThickness * 0.4 : 0))}
                  r={Math.max(10, lumenRadius * 0.5)}
                  fill={isCurrentStented ? '#ff4d4d' : '#f87171'}
                  opacity="0.6"
                />

                {/* 6. Metallic Stent Struts (Shown when Stented) */}
                {isCurrentStented && (
                  <g>
                    {/* Outer expandable Stent Scaffolding Ring */}
                    <circle
                      cx="150"
                      cy="150"
                      r="90"
                      fill="none"
                      stroke="#00e5ff"
                      strokeWidth="3.2"
                      strokeDasharray="8 6"
                      filter="drop-shadow(0 0 6px #00e5ff)"
                    />
                    {/* Metallic Stent Strut Nodes (12 radial cobalt-chromium crowns) */}
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
                      const rad = (deg * Math.PI) / 180;
                      const cx = 150 + 90 * Math.cos(rad);
                      const cy = 150 + 90 * Math.sin(rad);
                      return (
                        <g key={deg}>
                          <circle cx={cx} cy={cy} r="3.5" fill="#38bdf8" stroke="#00e5ff" strokeWidth="1" />
                          <circle cx={cx} cy={cy} r="1.5" fill="#ffffff" />
                        </g>
                      );
                    })}
                  </g>
                )}
              </svg>

              {/* Status Label on Top of SVG */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '11px',
                color: isCurrentStented ? '#34d399' : '#f87171',
                fontWeight: 600
              }}>
                {isCurrentStented ? '✓ Fully Expanded Stent (100% Patency)' : `Lumen Stenosis: ${(baselineRisk * 100).toFixed(0)}%`}
              </div>
            </div>

            {/* Anatomical Legend */}
            <div style={{ width: '100%', marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#dc2626', borderRadius: '2px' }}></span>
                <span>Arterial Lumen</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#ca8a04', borderRadius: '2px' }}></span>
                <span>Lipid-Rich Plaque</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#fde047', borderRadius: '2px' }}></span>
                <span>Fibrous Cap</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: isCurrentStented ? '#00e5ff' : '#64748b', borderRadius: '2px' }}></span>
                <span>{isCurrentStented ? 'Stent Struts (DES)' : 'Vessel Wall (Media)'}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Clinical Metrics & Angioplasty Stent Deployment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Vessel Metadata & Location Card */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '18px 22px'
            }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#00b4d8', fontWeight: 700, marginBottom: '6px' }}>
                Anatomical Identification & Morphology
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#f8fafc' }}>
                {currentInfo.name}
              </h4>
              <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '8px' }}>
                <strong>Territory: </strong>{currentInfo.territory}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#94a3b8' }}>
                <span><strong>Lesion Site: </strong>{currentInfo.location}</span>
                <span><strong>Reference Vessel Diameter: </strong>{currentInfo.vesselDiameter}</span>
              </div>
            </div>

            {/* Hemodynamics Telemetry Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {/* Metric 1: Fractional Flow Reserve (FFR) */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${ffr < 0.80 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                borderRadius: '14px',
                padding: '16px',
                boxShadow: ffr < 0.80 ? '0 0 15px rgba(239, 68, 68, 0.1)' : '0 0 15px rgba(16, 185, 129, 0.1)'
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Fractional Flow Reserve (FFR)
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: ffr < 0.80 ? '#f87171' : '#34d399', margin: '4px 0' }}>
                  {ffr.toFixed(2)}
                </div>
                <div style={{ fontSize: '11px', color: ffr < 0.80 ? '#fca5a5' : '#6ee7b7', fontWeight: 500 }}>
                  {ffr < 0.80 ? '⚠ Ischemia (Cutoff ≤ 0.80)' : '✓ Normal Myocardial Perfusion'}
                </div>
              </div>

              {/* Metric 2: Minimum Lumen Area (MLA) */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Minimum Lumen Area (MLA)
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: mla < 3.5 ? '#f59e0b' : '#f8fafc', margin: '4px 0' }}>
                  {mla} <span style={{ fontSize: '16px', fontWeight: 500 }}>mm²</span>
                </div>
                <div style={{ fontSize: '11px', color: mla < 3.5 ? '#fcd34d' : '#94a3b8' }}>
                  {mla < 3.5 ? 'Significant Obstruction (<3.5)' : 'Optimal Patency'}
                </div>
              </div>

              {/* Metric 3: Distal Perfusion Pressure */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Coronary Pressure
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
                  {perfusionPressure} <span style={{ fontSize: '16px', fontWeight: 500 }}>mmHg</span>
                </div>
                <div style={{ fontSize: '11px', color: isCurrentStented ? '#34d399' : '#94a3b8' }}>
                  {isCurrentStented ? 'Restored Gradient' : 'Pre-stenotic Baseline'}
                </div>
              </div>
            </div>

            {/* Virtual Angioplasty / Stenting Action Box */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(14, 165, 233, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(0, 180, 216, 0.3)',
              borderRadius: '18px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} color="#00e5ff" />
                    Percutaneous Coronary Intervention (PCI) Simulator
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    Recommended Device: <strong>{currentInfo.stentRecommendation}</strong>
                  </div>
                </div>

                {isCurrentStented && (
                  <span style={{
                    fontSize: '11px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle size={13} /> Stent Deployed
                  </span>
                )}
              </div>

              {/* Deployment Steps Progress Bar during Animation */}
              {isDeploying && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(0, 180, 216, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: '#38bdf8'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Activity size={16} className="animate-spin" color="#00e5ff" />
                    <span>
                      {deploymentStep === 1 && '1/3 Engaging 6F guiding catheter & crossing lesion with 0.014" wire...'}
                      {deploymentStep === 2 && '2/3 Performing semi-compliant balloon pre-dilation at 12 atm...'}
                      {deploymentStep === 3 && '3/3 Expanding Drug-Eluting Stent at nominal 16 atm...'}
                      {deploymentStep === 4 && 'Complete! Post-dilation verified; full stent apposition achieved.'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(deploymentStep / 4) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #00b4d8, #10b981)',
                      transition: 'width 0.4s ease'
                    }}></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {!isCurrentStented ? (
                  <button
                    onClick={handleDeployStent}
                    disabled={isDeploying}
                    style={{
                      background: 'linear-gradient(90deg, #0284c7 0%, #00b4d8 100%)',
                      border: 'none',
                      color: '#f8fafc',
                      padding: '12px 22px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: isDeploying ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0, 180, 216, 0.4)',
                      transition: 'transform 0.1s'
                    }}
                  >
                    <Zap size={16} />
                    {isDeploying ? 'Executing Angioplasty...' : `Deploy Stent in ${selectedVessel}`}
                  </button>
                ) : (
                  <button
                    onClick={handleRemoveStent}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <RotateCw size={15} />
                    Retract Stent / Reset Lesion
                  </button>
                )}

                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {isCurrentStented
                    ? 'Stent is live on 3D Heart model & vessel flow.'
                    : 'Simulate procedural lumen restoration and FFR rebound.'}
                </div>
              </div>
            </div>

            {/* Post-Intervention Simulated Risk Impact */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Heart size={20} color={isCurrentStented ? '#10b981' : '#f87171'} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    Cardiovascular Risk Status ({selectedVessel})
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {isCurrentStented
                      ? `Baseline Stenosis: ${(baselineRisk * 100).toFixed(1)}% → Post-Stent: 4.5% (Restored)`
                      : `Baseline Stenosis: ${(baselineRisk * 100).toFixed(1)}% (Pre-Intervention)`}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: isCurrentStented ? '#34d399' : (baselineRisk > 0.5 ? '#f87171' : '#38bdf8')
                }}>
                  {(currentRisk * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>
                  {isCurrentStented ? 'Revascularized' : 'Occlusion Risk'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(10, 15, 26, 0.95)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={14} color="#00b4d8" />
            Stents deployed here reflect synchronously in the main 3D heart model and hemodynamic pulse engine.
          </div>

          <button
            onClick={onClose}
            className="btn-dark"
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              borderRadius: '10px',
              background: '#0284c7',
              borderColor: '#0284c7'
            }}
          >
            Return to 3D Cardiac View
          </button>
        </div>
      </div>
    </div>
  );
}
