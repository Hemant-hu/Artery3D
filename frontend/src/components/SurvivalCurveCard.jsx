import React, { useState } from 'react';

/**
 * SurvivalCurveCard
 * 10-Year Major Adverse Cardiac Event (MACE) Time-to-Event Prognosis.
 * Renders an interactive SVG Kaplan-Meier / Cox Proportional Hazards curve,
 * milestone cards (1-yr, 5-yr, 10-yr MACE risk), and live counterfactual intervention comparison.
 */
function SurvivalCurveCard({ baselineSurvival, simulatedSurvival, onJumpToSimulator }) {
  const [hoveredYear, setHoveredYear] = useState(null);

  const survivalData = baselineSurvival || {
    risk_tier: 'High MACE Risk',
    tier_color: '#f97316',
    one_year_mace_risk: 0.045,
    five_year_mace_risk: 0.284,
    ten_year_mace_risk: 0.582,
    ten_year_survival_rate: 0.418,
    partial_hazard_ratio: 1.65,
    clinical_guidance: 'Accelerated 10-year MACE hazard trajectory. Guideline-Directed Medical Therapy (GDMT) strongly recommended.',
    survival_curve: [
      { year: 1, survival_probability: 0.955, survival_percent: 95.5, mace_risk_probability: 0.045, mace_risk_percent: 4.5 },
      { year: 2, survival_probability: 0.892, survival_percent: 89.2, mace_risk_probability: 0.108, mace_risk_percent: 10.8 },
      { year: 3, survival_probability: 0.814, survival_percent: 81.4, mace_risk_probability: 0.186, mace_risk_percent: 18.6 },
      { year: 4, survival_probability: 0.741, survival_percent: 74.1, mace_risk_probability: 0.259, mace_risk_percent: 25.9 },
      { year: 5, survival_probability: 0.716, survival_percent: 71.6, mace_risk_probability: 0.284, mace_risk_percent: 28.4 },
      { year: 6, survival_probability: 0.638, survival_percent: 63.8, mace_risk_probability: 0.362, mace_risk_percent: 36.2 },
      { year: 7, survival_probability: 0.559, survival_percent: 55.9, mace_risk_probability: 0.441, mace_risk_percent: 44.1 },
      { year: 8, survival_probability: 0.491, survival_percent: 49.1, mace_risk_probability: 0.509, mace_risk_percent: 50.9 },
      { year: 9, survival_probability: 0.448, survival_percent: 44.8, mace_risk_probability: 0.552, mace_risk_percent: 55.2 },
      { year: 10, survival_probability: 0.418, survival_percent: 41.8, mace_risk_probability: 0.582, mace_risk_percent: 58.2 }
    ],
    top_hazard_drivers: [
      { feature: 'Current Smoker', hazard_ratio: 2.12, impact_score: 0.75 },
      { feature: 'Age', hazard_ratio: 1.45, impact_score: 0.45 },
      { feature: 'LDL', hazard_ratio: 1.32, impact_score: 0.38 },
      { feature: 'BP', hazard_ratio: 1.25, impact_score: 0.32 }
    ]
  };

  const simData = simulatedSurvival || null;
  const isSimulated = !!simData;

  const baseCurve = survivalData.survival_curve || [];
  const simCurve = isSimulated ? (simData.survival_curve || []) : [];

  // SVG Chart Geometry
  const width = 720;
  const height = 300;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 45;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Scale functions
  const getX = (year) => padLeft + (year / 10) * chartW;
  const getY = (survPct) => padTop + (1.0 - (survPct / 100)) * chartH;

  // Generate SVG Path for Baseline
  const basePoints = [{ x: getX(0), y: getY(100) }];
  baseCurve.forEach(pt => {
    basePoints.push({ x: getX(pt.year), y: getY(pt.survival_percent) });
  });

  const baseLinePath = basePoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const baseAreaPath = `${baseLinePath} L ${getX(10)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

  // Generate SVG Path for Simulation (if present)
  let simLinePath = '';
  let simAreaPath = '';
  if (isSimulated && simCurve.length > 0) {
    const simPoints = [{ x: getX(0), y: getY(100) }];
    simCurve.forEach(pt => {
      simPoints.push({ x: getX(pt.year), y: getY(pt.survival_percent) });
    });
    simLinePath = simPoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
    simAreaPath = `${simLinePath} L ${getX(10)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;
  }

  // Active hover point
  const activePt = hoveredYear !== null ? baseCurve.find(p => p.year === hoveredYear) : null;
  const activeSimPt = hoveredYear !== null && isSimulated ? simCurve.find(p => p.year === hoveredYear) : null;

  // Gain stats
  const tenYearBaseRisk = (survivalData.ten_year_mace_risk * 100).toFixed(1);
  const tenYearSimRisk = isSimulated ? (simData.ten_year_mace_risk * 100).toFixed(1) : null;
  const tenYearRiskGain = isSimulated ? (tenYearBaseRisk - tenYearSimRisk).toFixed(1) : 0;

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '28px 32px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0',
      position: 'relative'
    }}>
      {/* Header Accent Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'
      }}></div>

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px' }}>⏳</span>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 700 }}>
              10-Year MACE Survival Prognosis
            </h3>
            <span style={{
              background: survivalData.tier_color ? `${survivalData.tier_color}18` : '#fef2f2',
              color: survivalData.tier_color || '#ef4444',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              border: `1px solid ${survivalData.tier_color || '#ef4444'}40`
            }}>
              {survivalData.risk_tier}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '650px' }}>
            Cox Proportional Hazards model forecasting longitudinal Major Adverse Cardiac Events
            (Myocardial Infarction, Stroke, Revascularization, or CV Death) over a 10-year horizon.
          </p>
        </div>

        {/* What-If Sync Status */}
        {isSimulated ? (
          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #a7f3d0',
            padding: '8px 16px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '16px' }}>✨</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#065f46' }}>
                Counterfactual GDMT Active
              </div>
              <div style={{ fontSize: '11px', color: '#047857' }}>
                10-Yr MACE Risk dropped by <strong>-{tenYearRiskGain}%</strong>
              </div>
            </div>
          </div>
        ) : onJumpToSimulator ? (
          <button
            onClick={onJumpToSimulator}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>⚡ Test Treatment Impact</span>
          </button>
        ) : null}
      </div>

      {/* 4 Milestones Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '14px',
        marginBottom: '28px'
      }}>
        {/* 1-Year MACE */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            1-Year MACE Risk
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {(survivalData.one_year_mace_risk * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Acute 12-mo plaque instability
          </div>
        </div>

        {/* 5-Year MACE */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            5-Year MACE Risk
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {(survivalData.five_year_mace_risk * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Mid-term secondary prevention
          </div>
        </div>

        {/* 10-Year MACE */}
        <div style={{
          background: isSimulated ? '#ecfdf5' : '#fef2f2',
          padding: '16px',
          borderRadius: '12px',
          border: `1px solid ${isSimulated ? '#a7f3d0' : '#fecaca'}`
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: isSimulated ? '#047857' : '#991b1b', textTransform: 'uppercase' }}>
            10-Year MACE Risk
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: isSimulated ? '#065f46' : '#b91c1c', marginTop: '4px' }}>
            {isSimulated ? `${tenYearSimRisk}%` : `${tenYearBaseRisk}%`}
            {isSimulated && (
              <span style={{ fontSize: '13px', color: '#059669', marginLeft: '6px', fontWeight: 600 }}>
                (-{tenYearRiskGain}%)
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: isSimulated ? '#059669' : '#b91c1c', marginTop: '2px' }}>
            {isSimulated ? `Baseline was ${tenYearBaseRisk}%` : 'Cumulative 10-year ischemic hazard'}
          </div>
        </div>

        {/* 10-Year Event-Free Survival Rate */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            10-Yr Event-Free Rate
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
            {isSimulated ? `${(100 - tenYearSimRisk).toFixed(1)}%` : `${(survivalData.ten_year_survival_rate * 100).toFixed(1)}%`}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Event-free survival probability
          </div>
        </div>
      </div>

      {/* Interactive SVG Survival Curve Canvas */}
      <div style={{
        background: '#0a0f1d',
        borderRadius: '14px',
        padding: '20px 24px',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Legend */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.5px' }}>
            KAPLAN-MEIER / COX PROPORTIONAL HAZARDS CURVE S(t)
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '3px', background: '#f59e0b', borderRadius: '2px' }}></span>
              <span style={{ color: '#cbd5e1' }}>Baseline Survival</span>
            </div>
            {isSimulated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '3px', background: '#10b981', borderRadius: '2px' }}></span>
                <span style={{ color: '#6ee7b7', fontWeight: 600 }}>Post-GDMT Simulation (Gain)</span>
              </div>
            )}
          </div>
        </div>

        {/* SVG Drawing */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          >
            <defs>
              {/* Gradient for Baseline Area */}
              <linearGradient id="baseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>

              {/* Gradient for Simulated Area */}
              <linearGradient id="simAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines - Horizontal (Y Axis: 0%, 25%, 50%, 75%, 100%) */}
            {[0, 25, 50, 75, 100].map(pct => {
              const y = getY(pct);
              return (
                <g key={pct}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray={pct === 50 ? '4 4' : 'none'}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Grid Lines - Vertical (X Axis: Years 0 to 10) */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(yr => {
              const x = getX(yr);
              return (
                <g key={yr}>
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={height - padBottom}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={height - padBottom + 18}
                    fill="#94a3b8"
                    fontSize="11"
                    textAnchor="middle"
                    fontWeight={yr === 1 || yr === 5 || yr === 10 ? '700' : '400'}
                  >
                    {yr === 0 ? 'Start' : `Yr ${yr}`}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Title */}
            <text
              x={padLeft + chartW / 2}
              y={height - 6}
              fill="#64748b"
              fontSize="11"
              textAnchor="middle"
              fontWeight="600"
            >
              Follow-up Duration (Years Post-Evaluation)
            </text>

            {/* Simulated Shaded Area */}
            {isSimulated && simAreaPath && (
              <path d={simAreaPath} fill="url(#simAreaGrad)" />
            )}

            {/* Baseline Shaded Area */}
            <path d={baseAreaPath} fill="url(#baseAreaGrad)" />

            {/* Simulated Line Curve */}
            {isSimulated && simLinePath && (
              <path
                d={simLinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Baseline Line Curve */}
            <path
              d={baseLinePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Milestone Dots on Baseline Curve */}
            {baseCurve.map(pt => {
              const cx = getX(pt.year);
              const cy = getY(pt.survival_percent);
              const isKey = pt.year === 1 || pt.year === 5 || pt.year === 10;
              const isHovered = hoveredYear === pt.year;

              return (
                <g
                  key={pt.year}
                  onMouseEnter={() => setHoveredYear(pt.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 7 : (isKey ? 5 : 3.5)}
                    fill={isHovered ? '#ffffff' : '#f59e0b'}
                    stroke="#0a0f1d"
                    strokeWidth="2"
                  />
                  {isKey && !isHovered && (
                    <text
                      x={cx}
                      y={cy - 10}
                      fill="#fcd34d"
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {pt.survival_percent}%
                    </text>
                  )}
                </g>
              );
            })}

            {/* Milestone Dots on Simulated Curve */}
            {isSimulated && simCurve.map(pt => {
              const cx = getX(pt.year);
              const cy = getY(pt.survival_percent);
              const isKey = pt.year === 1 || pt.year === 5 || pt.year === 10;
              const isHovered = hoveredYear === pt.year;

              return (
                <g
                  key={`sim-${pt.year}`}
                  onMouseEnter={() => setHoveredYear(pt.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 7 : (isKey ? 5 : 3.5)}
                    fill={isHovered ? '#ffffff' : '#10b981'}
                    stroke="#0a0f1d"
                    strokeWidth="2"
                  />
                  {isKey && !isHovered && (
                    <text
                      x={cx}
                      y={cy - 10}
                      fill="#6ee7b7"
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {pt.survival_percent}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Inspection Tooltip Overlay */}
        {activePt && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            right: '24px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '10px 16px',
            color: 'white',
            fontSize: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}>
            <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
              Year {activePt.year} Projection:
            </div>
            <div>
              <span style={{ color: '#f59e0b' }}>● Baseline Survival: </span>
              <strong>{activePt.survival_percent}%</strong> (MACE: {activePt.mace_risk_percent}%)
            </div>
            {activeSimPt && (
              <div style={{ marginTop: '2px' }}>
                <span style={{ color: '#10b981' }}>● Post-GDMT Survival: </span>
                <strong>{activeSimPt.survival_percent}%</strong> (MACE: {activeSimPt.mace_risk_percent}%)
                <span style={{ color: '#34d399', marginLeft: '6px' }}>
                  (+{(activeSimPt.survival_percent - activePt.survival_percent).toFixed(1)}% gain)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Hazard Multipliers & Clinical Guidance */}
      <div style={{
        marginTop: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Top Hazard Drivers */}
        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
            Primary Longitudinal Hazard Drivers
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(survivalData.top_hazard_drivers || []).map(d => (
              <div key={d.feature} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: '#475569', fontWeight: 500 }}>{d.feature}</span>
                <span style={{
                  background: d.hazard_ratio > 1.5 ? '#fee2e2' : '#fef3c7',
                  color: d.hazard_ratio > 1.5 ? '#991b1b' : '#92400e',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '11px'
                }}>
                  +{((d.hazard_ratio - 1.0) * 100).toFixed(0)}% Hazard
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Guidance Box */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #bbf7d0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Guideline-Directed Management Strategy
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#15803d', lineHeight: '1.5' }}>
            {survivalData.clinical_guidance}
          </p>
        </div>
      </div>
    </div>
  );
}

export default SurvivalCurveCard;
