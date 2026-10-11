import React, { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, useProgress } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';
import {
  Activity,
  Eye,
  RotateCw,
  Sliders,
  AlertTriangle,
  CheckCircle,
  Info,
  Layers,
  Compass,
  Zap,
  Tag,
  Heart,
  Droplets,
  Gauge
} from 'lucide-react';
import allModels from './heart_models.json';
import { classifyMesh, PIN_LOCATIONS } from './heartClassification';

// High-tech Clinical Loading HUD
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{
        background: 'rgba(10, 15, 26, 0.88)',
        border: '1px solid rgba(0, 180, 216, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 180, 216, 0.2)',
        borderRadius: '16px',
        padding: '24px 32px',
        textAlign: 'center',
        backdropFilter: 'blur(16px)',
        color: '#e2e8f0',
        minWidth: '280px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <Activity size={20} color="#00b4d8" className="animate-spin" />
          <span style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
            Reconstructing 3D Cardiac Anatomy
          </span>
        </div>
        <div style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
          {progress.toFixed(0)}%
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
          Parsing 119 High-Resolution Anatomical Meshes
        </div>
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #00b4d8 0%, #ff1744 100%)',
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 12px rgba(255, 23, 68, 0.5)'
          }}></div>
        </div>
      </div>
    </Html>
  );
}

// Physiological 3D Vascular Flow Pathways in Anatomical OBJ Coordinate Space
const VESSEL_CURVES = {
  // Left Anterior Descending Artery: LMCA origin down anterior interventricular groove to apex
  LAD: new THREE.CatmullRomCurve3([
    new THREE.Vector3(33.8, -122.7, 1250.9), // LMCA Bifurcation
    new THREE.Vector3(34.0, -135.0, 1238.0), // Proximal LAD
    new THREE.Vector3(34.2, -147.6, 1226.1), // Mid LAD / Septal branches
    new THREE.Vector3(38.0, -158.0, 1214.0), // Distal LAD
    new THREE.Vector3(44.0, -166.0, 1205.0)  // Cardiac Apex
  ]),
  // Left Circumflex Artery: LMCA origin along left atrioventricular sulcus to posterior LV
  LCX: new THREE.CatmullRomCurve3([
    new THREE.Vector3(33.8, -122.7, 1250.9), // LMCA Bifurcation
    new THREE.Vector3(41.0, -119.0, 1234.0), // LCX Trunk
    new THREE.Vector3(45.8, -114.9, 1216.5), // Left AV Sulcus / Marginal branch
    new THREE.Vector3(56.0, -106.0, 1200.0), // Posterior LV Branch
    new THREE.Vector3(68.0, -94.0, 1184.0)   // Posterolateral Branch
  ]),
  // Right Coronary Artery: Aortic root origin along right coronary sulcus to crux
  RCA: new THREE.CatmullRomCurve3([
    new THREE.Vector3(14.5, -121.7, 1251.7), // Right Coronary Ostium / Aorta
    new THREE.Vector3(9.5, -134.0, 1238.0),  // Proximal RCA
    new THREE.Vector3(5.3, -147.0, 1220.1),  // Mid RCA / Acute Marginal branch
    new THREE.Vector3(-6.0, -159.0, 1204.0), // Distal RCA
    new THREE.Vector3(-20.0, -172.0, 1188.0) // Crux / Posterior Descending
  ]),
  // Venous Circulation: Apex drainage UP anterior groove via Great Cardiac Vein to Coronary Sinus
  VEIN: new THREE.CatmullRomCurve3([
    new THREE.Vector3(42.0, -166.0, 1206.0), // Apex venous origin
    new THREE.Vector3(35.0, -148.0, 1218.0), // Anterior interventricular vein (parallel to LAD)
    new THREE.Vector3(30.7, -128.4, 1214.2), // Great Cardiac Vein
    new THREE.Vector3(38.0, -112.0, 1198.0), // Circumflex sulcus
    new THREE.Vector3(24.0, -105.0, 1182.0)  // Coronary Sinus entering Right Atrium
  ])
};

// Single Vascular Flow Stream using GPU InstancedMesh for 60 FPS performance
function VascularFlowStream({
  curve,
  count = 16,
  color = '#ff1744',
  emissive = '#ff0033',
  bpm = 75,
  speed = 0.38,
  isStenosed = false,
  isVein = false
}) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  const geometry = useMemo(() => new THREE.SphereGeometry(1.35, 12, 12), []);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive),
    emissiveIntensity: isStenosed ? 2.2 : isVein ? 1.6 : 1.3,
    roughness: 0.15,
    metalness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.95
  }), [color, emissive, isStenosed, isVein]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * (bpm / 75.0);
    const cycleFreq = bpm / 60.0;
    const tau = (t * cycleFreq) % 1.0;

    // Physiological systolic ejection wave
    const systolicSurge = (tau >= 0.06 && tau <= 0.32)
      ? Math.sin(((tau - 0.06) / 0.26) * Math.PI) ** 2
      : 0;

    for (let i = 0; i < count; i++) {
      const offset = i / count;
      const progress = (t * speed + offset) % 1.0;
      const point = curve.getPoint(progress);
      const tangent = curve.getTangent(progress);

      dummy.position.copy(point);

      // Envelope: tapers smoothly at vessel origins and endpoints
      const envelope = Math.sin(progress * Math.PI);
      let scale = envelope * (1.1 + 0.45 * systolicSurge);

      // Hemodynamic Bernoulli effect: particle narrows & accelerates through stenotic lesion
      if (isStenosed && progress > 0.42 && progress < 0.68) {
        scale *= 0.62;
      }

      dummy.scale.set(scale, scale, scale * 1.65); // Elongated along flow direction
      dummy.quaternion.setFromUnitVectors(zAxis, tangent);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} />
  );
}

// Complete Hemodynamic Flow Streams for LAD, LCX, RCA, and Venous Return
function HemodynamicFlowStreams({
  bpm = 75,
  ladRisk = 0,
  lcxRisk = 0,
  rcaRisk = 0,
  overallRisk = 0
}) {
  return (
    <group>
      {/* 1. LAD: Oxygenated scarlet flow down anterior sulcus */}
      <VascularFlowStream
        curve={VESSEL_CURVES.LAD}
        count={16}
        color="#ff1744"
        emissive="#ff0033"
        bpm={bpm}
        speed={0.42}
        isStenosed={ladRisk > 0.5}
      />

      {/* 2. LCX: Oxygenated arterial flow around left coronary sulcus */}
      <VascularFlowStream
        curve={VESSEL_CURVES.LCX}
        count={14}
        color="#ff2a55"
        emissive="#ff0044"
        bpm={bpm}
        speed={0.38}
        isStenosed={lcxRisk > 0.5}
      />

      {/* 3. RCA: Oxygenated arterial flow down right coronary sulcus */}
      <VascularFlowStream
        curve={VESSEL_CURVES.RCA}
        count={16}
        color="#ff1e38"
        emissive="#ff0022"
        bpm={bpm}
        speed={0.40}
        isStenosed={rcaRisk > 0.5}
      />

      {/* 4. Venous Return: Bioluminescent cyan-azure flow up Great Cardiac Vein to Coronary Sinus */}
      <VascularFlowStream
        curve={VESSEL_CURVES.VEIN}
        count={18}
        color="#00e5ff"
        emissive="#00b4d8"
        bpm={bpm}
        speed={0.34}
        isVein={true}
      />
    </group>
  );
}

// Biomechanical Cardiac Pumping Movement (Wiggers Helical Contraction & Torsion Cycle)
function PumpingHeartGroup({
  isBeating = true,
  bpm = 75,
  pumpingIntensity = 1.0,
  children
}) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    if (!isBeating) {
      // Smoothly return to relaxed anatomical baseline when paused
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.08);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.08);
      groupRef.current.position.set(0, 0, 0);
      return;
    }

    const t = clock.getElapsedTime();
    const cycleFreq = bpm / 60.0;
    const tau = (t * cycleFreq) % 1.0;

    // Physiological Cardiac Waveform:
    // 1. Ventricular Systole (Rapid Ejection - Lub): Phase 0.06 to 0.32
    let systole = 0;
    if (tau >= 0.06 && tau <= 0.32) {
      const p = (tau - 0.06) / 0.26;
      systole = Math.sin(p * Math.PI) ** 2.2;
    }

    // 2. Diastolic Rebound & Atrial Kick (Dub): Phase 0.52 to 0.74
    let diastoleKick = 0;
    if (tau >= 0.52 && tau <= 0.74) {
      const p = (tau - 0.52) / 0.22;
      diastoleKick = Math.sin(p * Math.PI) ** 2.0 * 0.34;
    }

    const totalContraction = (systole + diastoleKick) * pumpingIntensity;

    // Helical Ventricular Deformation:
    // Free walls squeeze inward in X/Z, AV plane descends in Y towards apex
    const scaleX = 1.0 - (0.046 * totalContraction);
    const scaleY = 1.0 - (0.062 * totalContraction);
    const scaleZ = 1.0 - (0.044 * totalContraction);
    groupRef.current.scale.set(scaleX, scaleY, scaleZ);

    // Left Ventricular Helical Torsion (Twisting of apex relative to base):
    const torsionY = 0.045 * systole * pumpingIntensity - 0.012 * diastoleKick * pumpingIntensity;
    const torsionZ = 0.020 * systole * pumpingIntensity;
    groupRef.current.rotation.y = torsionY;
    groupRef.current.rotation.z = torsionZ;

    // Heart position is strictly fixed at the origin (center)
    groupRef.current.position.set(0, 0, 0);
  });

  return <group ref={groupRef}>{children}</group>;
}

// Single Mesh Component with Dynamic Shader updates & Pulsing Emissive Glow
function HeartMesh({
  url,
  meta,
  color,
  opacity = 1.0,
  emissive = '#000000',
  emissiveIntensity = 0,
  isPulsing = false,
  isVisible = true,
  isHighlighted = false,
  bpm = 75,
  isBeating = true,
  onHover,
  onClick
}) {
  const obj = useLoader(OBJLoader, url);
  const meshRef = useRef();

  // Clone geometry once and store
  const geometryGroup = useMemo(() => {
    const clone = obj.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [obj]);

  // Create shared physical material for this mesh
  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: meta.isArtery ? 0.3 : meta.isVein ? 0.25 : meta.isMuscle ? 0.6 : 0.4,
      metalness: meta.isArtery ? 0.2 : meta.isVein ? 0.3 : 0.05,
      transparent: opacity < 0.99,
      opacity: opacity,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: emissiveIntensity,
      clearcoat: meta.isArtery || meta.isVein ? 0.8 : 0.2,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: opacity > 0.5
    });
  }, [meta]);

  // Keep material updated when visual props change without re-cloning geometry
  useEffect(() => {
    if (!material) return;
    material.color.set(color);
    material.opacity = isVisible ? opacity : 0;
    material.transparent = opacity < 0.99 || !isVisible;
    material.emissive.set(emissive);
    material.emissiveIntensity = isHighlighted ? Math.max(emissiveIntensity, 0.9) : emissiveIntensity;
    material.depthWrite = isVisible && opacity > 0.4;
    material.needsUpdate = true;

    geometryGroup.traverse((child) => {
      if (child.isMesh) {
        child.material = material;
        child.visible = isVisible && opacity > 0.01;
      }
    });
  }, [material, color, opacity, emissive, emissiveIntensity, isVisible, isHighlighted, geometryGroup]);

  // Synchronize vessel emissive light with the cardiac cycle & blood flow surge
  useFrame(({ clock }) => {
    if (!material || !isVisible) return;

    if (isBeating) {
      const t = clock.getElapsedTime();
      const cycleFreq = bpm / 60.0;
      const tau = (t * cycleFreq) % 1.0;

      // Systolic arterial surge burst
      let systolicSurge = 0;
      if (tau >= 0.06 && tau <= 0.32) {
        const p = (tau - 0.06) / 0.26;
        systolicSurge = Math.sin(p * Math.PI) ** 2;
      }

      // Diastolic venous drainage surge
      let diastolicSurge = 0;
      if (tau >= 0.36 && tau <= 0.68) {
        const p = (tau - 0.36) / 0.32;
        diastolicSurge = Math.sin(p * Math.PI) ** 2;
      }

      if (meta.isArtery) {
        const base = emissiveIntensity || 0.2;
        const alertBoost = isPulsing ? 1.0 : 0.45;
        material.emissiveIntensity = base + (systolicSurge * alertBoost) + (isHighlighted ? 0.6 : 0);
      } else if (meta.isVein) {
        const base = emissiveIntensity || 0.3;
        material.emissiveIntensity = base + (diastolicSurge * 0.55) + (isHighlighted ? 0.6 : 0);
      } else if (isHighlighted) {
        material.emissiveIntensity = Math.max(emissiveIntensity, 0.9);
      }
    } else if (isHighlighted) {
      material.emissiveIntensity = Math.max(emissiveIntensity, 0.9);
    }
  });

  return (
    <primitive
      ref={meshRef}
      object={geometryGroup}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover && onHover(meta);
      }}
      onPointerOut={() => {
        onHover && onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(meta);
      }}
    />
  );
}

// 3D Floating Pin Annotation
function VesselPinMarker({ pin, risk, isActive, onClick }) {
  const isHighRisk = risk !== null && risk > 0.5;
  const isNormalRisk = risk !== null && risk <= 0.5;

  const badgeColor = isHighRisk ? '#ff1744' : isNormalRisk ? '#10b981' : '#00b4d8';
  const badgeText = isHighRisk
    ? `${pin.label}: ${(risk * 100).toFixed(0)}% (Stenosis)`
    : isNormalRisk
    ? `${pin.label}: ${(risk * 100).toFixed(0)}% (Normal)`
    : pin.label;

  return (
    <Html position={pin.position} center distanceFactor={140} zIndexRange={[100, 0]}>
      <div
        onClick={onClick}
        style={{
          cursor: 'pointer',
          transform: isActive ? 'scale(1.15)' : 'scale(1.0)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            background: isActive ? '#f8fafc' : 'rgba(10, 15, 26, 0.92)',
            color: isActive ? '#090d16' : '#f8fafc',
            border: `1.5px solid ${badgeColor}`,
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            boxShadow: isHighRisk
              ? '0 0 15px rgba(255, 23, 68, 0.6), 0 4px 12px rgba(0,0,0,0.5)'
              : '0 0 10px rgba(0, 180, 216, 0.4), 0 4px 12px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: badgeColor,
              boxShadow: `0 0 8px ${badgeColor}`,
              display: 'inline-block'
            }}
          />
          {badgeText}
        </div>
        <div
          style={{
            width: '2px',
            height: '14px',
            background: `linear-gradient(180deg, ${badgeColor} 0%, transparent 100%)`
          }}
        />
      </div>
    </Html>
  );
}

// Camera Director for smooth transitions between vessel viewpoints
function CameraDirector({ controlsRef, viewAngle }) {
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (viewAngle) {
      case 'anterior': // Optimal for LAD & Great Cardiac Vein
        controls.object.position.set(0, -10, 200);
        controls.target.set(0, 0, 0);
        break;
      case 'posterior': // Optimal for Coronary Sinus & posterior circumflex
        controls.object.position.set(0, 15, -200);
        controls.target.set(0, 0, 0);
        break;
      case 'right': // Optimal for Right Coronary Artery tree
        controls.object.position.set(190, -10, 50);
        controls.target.set(0, 0, 0);
        break;
      case 'left': // Optimal for LCX & Obtuse Marginal branches
        controls.object.position.set(-190, 10, 50);
        controls.target.set(0, 0, 0);
        break;
      case 'superior': // Optimal for Cath / Aorta & LMCA stem
        controls.object.position.set(0, 190, 40);
        controls.target.set(0, 0, 0);
        break;
      case 'default':
      default:
        controls.object.position.set(50, 20, 180);
        controls.target.set(0, 0, 0);
        break;
    }
    controls.update();
  }, [viewAngle, controlsRef]);

  return null;
}

export default function HeartModel({ prediction }) {
  const basePath = '/models/BP51782_FMA3_2_1_inference_isa_FMA67135_Postnatal_anatomical_structure 2/BP51782_FMA3_2_1_inference_isa_FMA67135_Postnatal_anatomical_structure/';

  // ML Risk Outputs
  const ladRisk = prediction?.stenosis_probabilities?.LAD ?? 0;
  const lcxRisk = prediction?.stenosis_probabilities?.LCX ?? 0;
  const rcaRisk = prediction?.stenosis_probabilities?.RCA ?? 0;
  const overallRisk = prediction?.overall_cad_risk ?? 0;

  // View States
  const [viewMode, setViewMode] = useState('ghost');
  const [muscleOpacity, setMuscleOpacity] = useState(0.22);
  const [selectedVessel, setSelectedVessel] = useState('ALL');
  const [hoveredMeta, setHoveredMeta] = useState(null);
  const [showPins, setShowPins] = useState(true);
  const [viewAngle, setViewAngle] = useState('default');

  // Pumping & Hemodynamics States
  const [isBeating, setIsBeating] = useState(true);
  const [isFlowing, setIsFlowing] = useState(true);
  const [bpm, setBpm] = useState(75);
  const [pumpingIntensity, setPumpingIntensity] = useState(1.0);

  const controlsRef = useRef();

  // Sync slider when viewMode button is pressed
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'angiogram') setMuscleOpacity(0.0);
    else if (mode === 'ghost') setMuscleOpacity(0.22);
    else if (mode === 'solid') setMuscleOpacity(0.95);
  };

  // Color Definitions
  const colors = useMemo(() => ({
    arteryHealthy: '#8b1515',
    arteryStenosis: '#ff1744',
    arterySelected: '#ff5252',
    lmcaStem: overallRisk > 0.5 ? '#ff6d00' : '#8b1515',
    veinCoronary: '#00b4d8',
    coronarySinus: '#0077b6',
    pulmonary: '#3a506b',
    aorta: '#c62828',
    valve: '#f1eee7',
    conduction: '#ffc107',
    myocardium: '#6e1a24'
  }), [overallRisk]);

  // Process all 119 meshes with classification & metadata
  const classifiedMeshes = useMemo(() => {
    return allModels.map((filename) => {
      const meta = classifyMesh(filename);
      return { filename, meta };
    });
  }, []);

  // Compute live visual properties per mesh
  const renderedMeshes = useMemo(() => {
    return classifiedMeshes.map(({ filename, meta }) => {
      const isLAD = meta.category === 'LAD';
      const isLCX = meta.category === 'LCX';
      const isRCA = meta.category === 'RCA';
      const isLMCA = meta.category === 'LMCA';
      const isVein = meta.category === 'VEIN';
      const isAorta = meta.category === 'AORTA';
      const isPulm = meta.category === 'PULMONARY';
      const isValve = meta.category === 'VALVE';
      const isCond = meta.category === 'CONDUCTION';
      const isMuscle = meta.category === 'MYOCARDIUM';

      // Visibility filter based on vessel selection
      let isVisible = true;
      if (selectedVessel !== 'ALL') {
        if (selectedVessel === 'LAD') isVisible = isLAD || isVein || isMuscle || isLMCA;
        else if (selectedVessel === 'LCX') isVisible = isLCX || isMuscle || isLMCA;
        else if (selectedVessel === 'RCA') isVisible = isRCA || isMuscle;
        else if (selectedVessel === 'LMCA') isVisible = isLMCA || isLAD || isLCX || isAorta || isMuscle;
        else if (selectedVessel === 'VEIN') isVisible = isVein || isMuscle;
      }

      // Base Opacity
      let opacity = 1.0;
      if (isMuscle) {
        opacity = muscleOpacity;
      } else if (isAorta || isPulm) {
        opacity = muscleOpacity < 0.1 ? 0.35 : 0.85;
      } else if (isValve) {
        opacity = muscleOpacity < 0.1 ? 0.2 : 0.75;
      } else if (isCond) {
        opacity = 0.9;
      }

      // Vessel Specific Coloring & Risk mapping
      let color = colors.myocardium;
      let emissive = '#000000';
      let emissiveIntensity = 0;
      let isPulsing = false;

      if (isLAD) {
        const isHigh = ladRisk > 0.5;
        color = isHigh ? colors.arteryStenosis : colors.arteryHealthy;
        emissive = isHigh ? '#ff0000' : '#4a0000';
        emissiveIntensity = isHigh ? 1.0 : 0.25;
        isPulsing = isHigh;
      } else if (isLCX) {
        const isHigh = lcxRisk > 0.5;
        color = isHigh ? colors.arteryStenosis : colors.arteryHealthy;
        emissive = isHigh ? '#ff0000' : '#4a0000';
        emissiveIntensity = isHigh ? 1.0 : 0.25;
        isPulsing = isHigh;
      } else if (isRCA) {
        const isHigh = rcaRisk > 0.5;
        color = isHigh ? colors.arteryStenosis : colors.arteryHealthy;
        emissive = isHigh ? '#ff0000' : '#4a0000';
        emissiveIntensity = isHigh ? 1.0 : 0.25;
        isPulsing = isHigh;
      } else if (isLMCA) {
        const isHigh = overallRisk > 0.5;
        color = isHigh ? '#ff7b00' : colors.arteryHealthy;
        emissive = isHigh ? '#ff5500' : '#4a0000';
        emissiveIntensity = isHigh ? 1.2 : 0.2;
        isPulsing = isHigh;
      } else if (isVein) {
        color = colors.veinCoronary;
        emissive = '#004368';
        emissiveIntensity = 0.35;
      } else if (isAorta) {
        color = colors.aorta;
      } else if (isPulm) {
        color = colors.pulmonary;
      } else if (isValve) {
        color = colors.valve;
      } else if (isCond) {
        color = colors.conduction;
        emissive = '#d48806';
        emissiveIntensity = 0.4;
      } else if (isMuscle) {
        color = colors.myocardium;
      }

      // Highlight active vessel filter
      const isHighlighted = (
        (selectedVessel === 'LAD' && isLAD) ||
        (selectedVessel === 'LCX' && isLCX) ||
        (selectedVessel === 'RCA' && isRCA) ||
        (selectedVessel === 'LMCA' && isLMCA) ||
        (selectedVessel === 'VEIN' && isVein) ||
        (hoveredMeta && hoveredMeta.category === meta.category)
      );

      if (isHighlighted) {
        emissiveIntensity = Math.max(emissiveIntensity, 0.9);
      }

      return (
        <HeartMesh
          key={filename}
          url={`${basePath}${filename}`}
          meta={meta}
          color={color}
          opacity={opacity}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          isPulsing={isPulsing}
          isVisible={isVisible}
          isHighlighted={isHighlighted}
          bpm={bpm}
          isBeating={isBeating}
          onHover={setHoveredMeta}
          onClick={(m) => {
            setSelectedVessel(m.category);
            if (m.category === 'LAD') setViewAngle('anterior');
            else if (m.category === 'LCX') setViewAngle('left');
            else if (m.category === 'RCA') setViewAngle('right');
            else if (m.category === 'LMCA') setViewAngle('superior');
            else if (m.category === 'VEIN') setViewAngle('posterior');
          }}
        />
      );
    });
  }, [classifiedMeshes, selectedVessel, muscleOpacity, ladRisk, lcxRisk, rcaRisk, overallRisk, colors, hoveredMeta, bpm, isBeating, basePath]);

  // Active diagnostic inspection data (hovered or selected vessel or overall summary)
  const activeInspection = useMemo(() => {
    if (hoveredMeta) return hoveredMeta;
    if (selectedVessel === 'LAD') {
      return {
        category: 'LAD',
        displayName: 'Left Anterior Descending Artery (LAD)',
        territory: 'Anterior left ventricular wall, anterior interventricular septum, apex',
        clinicalNote: 'Critical "widowmaker" vessel supplying >50% of myocardial muscle mass. Occlusion produces anterior STEMI.',
        risk: ladRisk
      };
    }
    if (selectedVessel === 'LCX') {
      return {
        category: 'LCX',
        displayName: 'Left Circumflex Artery (LCX)',
        territory: 'Lateral and posterior left ventricle, obtuse marginal branches',
        clinicalNote: 'Runs in coronary sulcus. Stenosis presents with lateral wall infarction and posterolateral ischemia.',
        risk: lcxRisk
      };
    }
    if (selectedVessel === 'RCA') {
      return {
        category: 'RCA',
        displayName: 'Right Coronary Artery (RCA)',
        territory: 'Right atrium, right ventricle, inferior LV, SA node (60%), AV node (90%)',
        clinicalNote: 'Supplies intrinsic conduction pacemakers. Stenosis risks complete heart block and inferior STEMI.',
        risk: rcaRisk
      };
    }
    if (selectedVessel === 'LMCA') {
      return {
        category: 'LMCA',
        displayName: 'Left Main Coronary Artery (LMCA / Cath Entry)',
        territory: 'Common stem bifurcation dividing into LAD and LCX',
        clinicalNote: 'Cannulation site during coronary angiography (Cath). Stenosis here carries class-1 CABG bypass indication.',
        risk: overallRisk
      };
    }
    if (selectedVessel === 'VEIN') {
      return {
        category: 'VEIN',
        displayName: 'Coronary Venous Drainage Network',
        territory: 'Great Cardiac Vein (anterior groove) & Coronary Sinus (posterior)',
        clinicalNote: 'Drains deoxygenated myocardial blood into the right atrium. Critical landmark for electrophysiology & CRT pacemaker leads.',
        risk: null
      };
    }
    // Default: Overall Coronary Tree Summary
    return {
      category: 'ALL',
      displayName: 'Coronary Arterial & Venous Map',
      territory: 'Comprehensive 119-component cardiac arterial, venous, and conduction anatomy',
      clinicalNote: `Overall CAD Catheterization Stenosis Probability: ${(overallRisk * 100).toFixed(1)}%. Click any vessel pill or 3D pin to inspect clinical territory.`,
      risk: overallRisk
    };
  }, [hoveredMeta, selectedVessel, ladRisk, lcxRisk, rcaRisk, overallRisk]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '600px', background: 'radial-gradient(circle at 50% 40%, #111827 0%, #080c14 100%)', overflow: 'hidden' }}>

      {/* 3D WebGL Canvas */}
      <Canvas
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        camera={{ position: [50, 20, 180], fov: 42 }}
      >
        <Suspense fallback={<Loader />}>
          <ambientLight intensity={0.65} />
          {/* Main anterior key light */}
          <directionalLight position={[40, 50, 60]} intensity={1.8} color="#ffffff" />
          {/* Cyan venous rim light */}
          <directionalLight position={[-50, -30, -40]} intensity={1.2} color="#00b4d8" />
          {/* Red arterial rim light */}
          <directionalLight position={[40, -40, -40]} intensity={1.0} color="#ff3366" />
          <pointLight position={[0, 40, 30]} intensity={0.8} />

          {/* Studio HDRI Reflections & Soft Floor Shadow */}
          <Environment preset="city" />
          <ContactShadows
            position={[0, -58, 0]}
            opacity={0.65}
            scale={160}
            blur={2.4}
            far={75}
          />

          {/* Realistic Biomechanical Pumping Heart Movement */}
          <PumpingHeartGroup
            isBeating={isBeating}
            bpm={bpm}
            pumpingIntensity={pumpingIntensity}
          >
            {/* Precise Geometric Centering: Offsets all 119 meshes directly to origin (0, 0, 0) */}
            <group position={[-22.888, 123.916, -1233.615]}>
              {renderedMeshes}

              {/* Hemodynamic Blood Pumping through Veins & Arteries */}
              {isFlowing && (
                <HemodynamicFlowStreams
                  bpm={bpm}
                  ladRisk={ladRisk}
                  lcxRisk={lcxRisk}
                  rcaRisk={rcaRisk}
                  overallRisk={overallRisk}
                />
              )}

              {/* 3D Interactive Vessel Pins anchored directly to cardiac surface */}
              {showPins && PIN_LOCATIONS.map((pin) => {
                let risk = null;
                if (pin.vesselKey === 'LAD') risk = ladRisk;
                else if (pin.vesselKey === 'LCX') risk = lcxRisk;
                else if (pin.vesselKey === 'RCA') risk = rcaRisk;
                else if (pin.vesselKey === 'Overall_CAD') risk = overallRisk;

                return (
                  <VesselPinMarker
                    key={pin.id}
                    pin={pin}
                    risk={risk}
                    isActive={selectedVessel === pin.id}
                    onClick={() => {
                      setSelectedVessel(pin.id);
                      if (pin.id === 'LAD') setViewAngle('anterior');
                      else if (pin.id === 'LCX') setViewAngle('left');
                      else if (pin.id === 'RCA') setViewAngle('right');
                      else if (pin.id === 'LMCA') setViewAngle('superior');
                      else if (pin.id === 'VEIN') setViewAngle('posterior');
                    }}
                  />
                );
              })}
            </group>
          </PumpingHeartGroup>

          <CameraDirector controlsRef={controlsRef} viewAngle={viewAngle} />

          {/* 360-Degree Orbital Controls locked strictly to heart center */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            target={[0, 0, 0]}
            enablePan={false}
            enableRotate={true}
            enableZoom={true}
            autoRotate={false}
            minDistance={40}
            maxDistance={420}
            enableDamping
            dampingFactor={0.08}
          />
        </Suspense>
      </Canvas>

      {/* UNIFIED TOP HUD: Header, View Modes, Vessel Filters, and Hemodynamic Pumping Controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        {/* ROW 1 (UP): Header Badge & View Mode Switchers */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* Title Badge */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '8px 14px',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#f8fafc',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            pointerEvents: 'auto'
          }}>
            <Activity size={18} color="#00b4d8" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Coronary Angiogram & Vessel Tree
                <span style={{
                  background: overallRisk > 0.5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: overallRisk > 0.5 ? '#f87171' : '#34d399',
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: `1px solid ${overallRisk > 0.5 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                }}>
                  {overallRisk > 0.5 ? `Cath: ${(overallRisk * 100).toFixed(0)}% CAD Risk` : `Cath: Normal`}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                119 Biological Meshes • Real-time ML Stenosis Projection
              </div>
            </div>
          </div>

          {/* View Mode Tabs (Angiogram vs X-Ray Ghost vs Solid) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '4px',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            gap: '4px',
            pointerEvents: 'auto'
          }}>
            <button
              onClick={() => handleViewModeChange('angiogram')}
              style={{
                background: viewMode === 'angiogram' ? 'linear-gradient(135deg, #00b4d8, #0077b6)' : 'transparent',
                color: viewMode === 'angiogram' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Zap size={14} /> Angiogram (Vessels Only)
            </button>

            <button
              onClick={() => handleViewModeChange('ghost')}
              style={{
                background: viewMode === 'ghost' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                color: viewMode === 'ghost' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Layers size={14} /> X-Ray Ghost (22%)
            </button>

            <button
              onClick={() => handleViewModeChange('solid')}
              style={{
                background: viewMode === 'solid' ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'transparent',
                color: viewMode === 'solid' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Eye size={14} /> Solid Anatomy
            </button>
          </div>
        </div>

        {/* ROW 2 (BELOW ROW 1): Target Vessel Filter Pills */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          pointerEvents: 'auto'
        }}>
          {/* LAD Button */}
          <button
            onClick={() => {
              setSelectedVessel('LAD');
              setViewAngle('anterior');
            }}
            style={{
              background: selectedVessel === 'LAD'
                ? (ladRisk > 0.5 ? '#dc2626' : '#2563eb')
                : 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${ladRisk > 0.5 ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '999px',
              padding: '5px 12px',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              boxShadow: ladRisk > 0.5 ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: ladRisk > 0.5 ? '#ff1744' : '#10b981'
            }}></span>
            LAD: {(ladRisk * 100).toFixed(0)}%
          </button>

          {/* LCX Button */}
          <button
            onClick={() => {
              setSelectedVessel('LCX');
              setViewAngle('left');
            }}
            style={{
              background: selectedVessel === 'LCX'
                ? (lcxRisk > 0.5 ? '#dc2626' : '#2563eb')
                : 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${lcxRisk > 0.5 ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '999px',
              padding: '5px 12px',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              boxShadow: lcxRisk > 0.5 ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: lcxRisk > 0.5 ? '#ff1744' : '#10b981'
            }}></span>
            LCX: {(lcxRisk * 100).toFixed(0)}%
          </button>

          {/* RCA Button */}
          <button
            onClick={() => {
              setSelectedVessel('RCA');
              setViewAngle('right');
            }}
            style={{
              background: selectedVessel === 'RCA'
                ? (rcaRisk > 0.5 ? '#dc2626' : '#2563eb')
                : 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${rcaRisk > 0.5 ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '999px',
              padding: '5px 12px',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              boxShadow: rcaRisk > 0.5 ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: rcaRisk > 0.5 ? '#ff1744' : '#10b981'
            }}></span>
            RCA: {(rcaRisk * 100).toFixed(0)}%
          </button>

          {/* Cath / LMCA Button */}
          <button
            onClick={() => {
              setSelectedVessel('LMCA');
              setViewAngle('superior');
            }}
            style={{
              background: selectedVessel === 'LMCA'
                ? '#d97706'
                : 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${overallRisk > 0.5 ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '999px',
              padding: '5px 12px',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              boxShadow: overallRisk > 0.5 ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: overallRisk > 0.5 ? '#f59e0b' : '#10b981'
            }}></span>
            Cath / LMCA: {(overallRisk * 100).toFixed(0)}%
          </button>

          {/* Coronary Veins Button */}
          <button
            onClick={() => {
              setSelectedVessel('VEIN');
              setViewAngle('posterior');
            }}
            style={{
              background: selectedVessel === 'VEIN'
                ? '#0284c7'
                : 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(0, 180, 216, 0.4)',
              borderRadius: '999px',
              padding: '5px 12px',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#00b4d8'
            }}></span>
            Cardiac Veins & Sinus
          </button>

          {/* Reset / All Anatomy Button */}
          {selectedVessel !== 'ALL' && (
            <button
              onClick={() => {
                setSelectedVessel('ALL');
                setViewAngle('default');
              }}
              style={{
                background: 'rgba(51, 65, 85, 0.8)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '999px',
                padding: '5px 12px',
                color: '#e2e8f0',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backdropFilter: 'blur(10px)'
              }}
            >
              <RotateCw size={12} /> Show All Anatomy
            </button>
          )}
        </div>

        {/* ROW 3 (BELOW ROW 2): Cardiac Hemodynamics & Pumping Controls */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          pointerEvents: 'auto'
        }}>
          {/* Heartbeat Pumping Toggle */}
          <button
            onClick={() => setIsBeating(!isBeating)}
            style={{
              background: isBeating ? 'rgba(239, 68, 68, 0.25)' : 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${isBeating ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '999px',
              padding: '4px 12px',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              boxShadow: isBeating ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Heart size={13} color={isBeating ? '#ff1744' : '#94a3b8'} fill={isBeating ? '#ff1744' : 'none'} />
            {isBeating ? `Heart Movement: Active (${bpm} BPM)` : 'Heart Movement: Paused'}
          </button>

          {/* Blood Flow Toggle */}
          <button
            onClick={() => setIsFlowing(!isFlowing)}
            style={{
              background: isFlowing ? 'rgba(0, 180, 216, 0.25)' : 'rgba(15, 23, 42, 0.85)',
              border: `1px solid ${isFlowing ? '#00b4d8' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '999px',
              padding: '4px 12px',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              boxShadow: isFlowing ? '0 0 10px rgba(0, 180, 216, 0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Droplets size={13} color={isFlowing ? '#00e5ff' : '#94a3b8'} />
            {isFlowing ? 'Vessel Blood Flow: Active' : 'Vessel Blood Flow: Off'}
          </button>

          {/* BPM Rate Selection Bar */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '999px',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            <button
              onClick={() => setBpm(60)}
              style={{
                background: bpm === 60 ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                color: bpm === 60 ? '#60a5fa' : '#94a3b8',
                border: 'none',
                borderRadius: '999px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              60 BPM (Rest)
            </button>
            <button
              onClick={() => setBpm(75)}
              style={{
                background: bpm === 75 ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                color: bpm === 75 ? '#34d399' : '#94a3b8',
                border: 'none',
                borderRadius: '999px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              75 BPM (Normal)
            </button>
            <button
              onClick={() => setBpm(100)}
              style={{
                background: bpm === 100 ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                color: bpm === 100 ? '#f87171' : '#94a3b8',
                border: 'none',
                borderRadius: '999px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              100 BPM (Stress)
            </button>
          </div>

          {/* Pumping Intensity / Force Toggle */}
          <button
            onClick={() => setPumpingIntensity(p => p === 1.0 ? 1.4 : p === 1.4 ? 0.6 : 1.0)}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '999px',
              padding: '4px 10px',
              color: '#cbd5e1',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s'
            }}
          >
            <Gauge size={12} color="#00b4d8" />
            Pump Force: {pumpingIntensity === 1.4 ? 'Strong (140%)' : pumpingIntensity === 0.6 ? 'Gentle (60%)' : 'Standard (100%)'}
          </button>
        </div>
      </div>

      {/* BOTTOM LEFT: Clinical Diagnostic Inspector Card */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        maxWidth: '380px',
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '16px 20px',
        color: '#f8fafc',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 10,
        pointerEvents: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} color="#00b4d8" />
            <strong style={{ fontSize: '13px', color: '#f1f5f9' }}>
              {activeInspection.displayName}
            </strong>
          </div>
          {activeInspection.risk !== null && (
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: activeInspection.risk > 0.5 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
              color: activeInspection.risk > 0.5 ? '#f87171' : '#34d399',
              border: `1px solid ${activeInspection.risk > 0.5 ? '#ef4444' : '#10b981'}`
            }}>
              {activeInspection.risk > 0.5 ? 'STENOSIS RISK' : 'NORMAL'}
            </span>
          )}
        </div>

        {activeInspection.risk !== null && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              <span>Probability of Stenosis (&ge;50% occlusion)</span>
              <strong style={{ color: activeInspection.risk > 0.5 ? '#ef4444' : '#34d399' }}>
                {(activeInspection.risk * 100).toFixed(1)}%
              </strong>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                width: `${activeInspection.risk * 100}%`,
                height: '100%',
                background: activeInspection.risk > 0.5 ? '#ef4444' : '#10b981',
                boxShadow: activeInspection.risk > 0.5 ? '0 0 8px #ef4444' : 'none'
              }}></div>
            </div>
          </div>
        )}

        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '6px' }}>
          <strong style={{ color: '#cbd5e1' }}>Myocardial Territory: </strong>
          {activeInspection.territory}
        </div>

        <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.45 }}>
          <strong style={{ color: '#38bdf8' }}>Clinical Significance: </strong>
          {activeInspection.clinicalNote}
        </div>
      </div>

      {/* BOTTOM RIGHT: Viewport Controls & Myocardium Opacity Slider */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
        zIndex: 10,
        pointerEvents: 'auto'
      }}>
        {/* Opacity Slider Control */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '10px 14px',
          backdropFilter: 'blur(14px)',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          minWidth: '220px'
        }}>
          <Sliders size={16} color="#00b4d8" />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px' }}>
              <span>Muscle Transparency</span>
              <strong>{(muscleOpacity * 100).toFixed(0)}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={muscleOpacity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setMuscleOpacity(val);
                if (val < 0.05) setViewMode('angiogram');
                else if (val > 0.8) setViewMode('solid');
                else setViewMode('ghost');
              }}
              style={{
                width: '100%',
                height: '4px',
                accentColor: '#00b4d8',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Camera Presets & Utilities */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '6px 10px',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {/* Quick Perspective Switchers */}
          <button
            title="Anterior View (LAD & Great Vein)"
            onClick={() => setViewAngle('anterior')}
            style={{
              background: viewAngle === 'anterior' ? 'rgba(0, 180, 216, 0.3)' : 'transparent',
              color: '#f8fafc',
              border: 'none',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Front (LAD)
          </button>

          <button
            title="Posterior View (Coronary Sinus & Veins)"
            onClick={() => setViewAngle('posterior')}
            style={{
              background: viewAngle === 'posterior' ? 'rgba(0, 180, 216, 0.3)' : 'transparent',
              color: '#f8fafc',
              border: 'none',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Back (Veins)
          </button>

          <button
            title="Right Sulcus View (RCA)"
            onClick={() => setViewAngle('right')}
            style={{
              background: viewAngle === 'right' ? 'rgba(0, 180, 216, 0.3)' : 'transparent',
              color: '#f8fafc',
              border: 'none',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            RCA
          </button>

          <button
            title="Left Sulcus View (LCX)"
            onClick={() => setViewAngle('left')}
            style={{
              background: viewAngle === 'left' ? 'rgba(0, 180, 216, 0.3)' : 'transparent',
              color: '#f8fafc',
              border: 'none',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            LCX
          </button>

          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)', margin: '0 2px' }}></div>

          {/* Toggle Labels */}
          <button
            title="Toggle 3D Vessel Tags"
            onClick={() => setShowPins(!showPins)}
            style={{
              background: showPins ? 'rgba(0, 180, 216, 0.3)' : 'transparent',
              color: showPins ? '#00b4d8' : '#94a3b8',
              border: 'none',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Tag size={15} />
          </button>

          {/* 360 Degree View Badge */}
          <div
            title="360° Free Orbit View - Fixed in Center"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: 'rgba(0, 180, 216, 0.15)',
              border: '1px solid rgba(0, 180, 216, 0.3)',
              borderRadius: '6px',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: 600,
              userSelect: 'none'
            }}
          >
            <Compass size={14} color="#00e5ff" />
            <span>360° View</span>
          </div>

          {/* Reset Camera to Center */}
          <button
            title="Reset to Center View"
            onClick={() => {
              setViewAngle('default');
              if (controlsRef.current) {
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.object.position.set(50, 20, 180);
                controlsRef.current.update();
              }
            }}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RotateCw size={15} />
          </button>
        </div>
      </div>

    </div>
  );
}
