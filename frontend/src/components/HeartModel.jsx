import React, { Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Html, useProgress } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';
import allModels from './heart_models.json';

// A Loading Screen component for the heavy 3D assembly
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: 'white', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Assembling 119-Piece 3D Heart</div>
        <div style={{ fontSize: '18px', color: '#ff4444' }}>{progress.toFixed(0)}% Loaded</div>
        <div style={{ width: '200px', height: '4px', background: '#333', marginTop: '10px', borderRadius: '2px' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#ff4444', transition: 'width 0.2s' }}></div>
        </div>
      </div>
    </Html>
  );
}

function HeartMesh({ url, color, opacity = 1.0, emissive = '#000000', emissiveIntensity = 0 }) {
  const obj = useLoader(OBJLoader, url);
  
  const geometry = useMemo(() => {
    const clone = obj.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: color,
          roughness: 0.6,
          metalness: 0.1,
          transparent: opacity < 1.0,
          opacity: opacity,
          emissive: emissive,
          emissiveIntensity: emissiveIntensity,
          clearcoat: 0.2,
          clearcoatRoughness: 0.3,
          side: THREE.DoubleSide
        });
      }
    });
    return clone;
  }, [obj, color, opacity, emissive, emissiveIntensity]);

  return <primitive object={geometry} />;
}

export default function HeartModel({ prediction }) {
  const basePath = '/models/BP51782_FMA3_2_1_inference_isa_FMA67135_Postnatal_anatomical_structure 2/BP51782_FMA3_2_1_inference_isa_FMA67135_Postnatal_anatomical_structure/';
  
  // ML Predictions
  const ladRisk = prediction?.stenosis_probabilities?.LAD || 0;
  const lcxRisk = prediction?.stenosis_probabilities?.LCX || 0;
  const rcaRisk = prediction?.stenosis_probabilities?.RCA || 0;
  const overallRisk = prediction?.overall_cad_risk || 0;
  
  // Base Anatomical Colors
  const muscleColor = '#b55a5a'; 
  const aortaColor = '#d94c4c'; // Oxygenated
  const veinColor = '#4c6ed9'; // Deoxygenated
  const valveColor = '#e6e6db'; // Fibrous tissue
  const nerveColor = '#e8d254'; // Nervous bundles / nodes
  
  // We determine the visual properties of each of the 119 meshes dynamically based on its biological name
  const renderMeshes = useMemo(() => {
    return allModels.map((filename, index) => {
      const lowerName = filename.toLowerCase();
      
      let meshColor = muscleColor;
      let meshOpacity = 0.95;
      let meshEmissive = '#000000';
      let meshEmissiveIntensity = 0;

      // 1. Identify ML Target Arteries (LAD, LCX, RCA)
      const isLAD = lowerName.includes('anterior interventricular artery');
      const isLCX = lowerName.includes('circumflex branch of left coronary artery');
      const isRCA = lowerName.includes('right coronary artery');
      
      if (isLAD || isLCX || isRCA) {
        let risk = 0;
        if (isLAD) risk = ladRisk;
        if (isLCX) risk = lcxRisk;
        if (isRCA) risk = rcaRisk;

        if (risk > 0.5) {
          // ML Triggered HIGH RISK -> Neon Glowing Red
          meshColor = '#ff0000';
          meshEmissive = '#ff0000';
          meshEmissiveIntensity = 1.0;
          meshOpacity = 1.0;
        } else {
          // Healthy Artery
          meshColor = '#6b0a0a'; // Very dark crimson
          meshOpacity = 1.0;
        }
      } 
      // 2. Classify remaining anatomy structurally
      else if (lowerName.includes('vein') || lowerName.includes('sinus') || lowerName.includes('pulmonary')) {
        meshColor = veinColor;
      } 
      else if (lowerName.includes('aorta') || lowerName.includes('artery') || lowerName.includes('branch')) {
        meshColor = aortaColor;
      }
      else if (lowerName.includes('valve') || lowerName.includes('anulus') || lowerName.includes('ring') || lowerName.includes('leaflet')) {
        meshColor = valveColor;
      }
      else if (lowerName.includes('node') || lowerName.includes('bundle') || lowerName.includes('tract')) {
        meshColor = nerveColor;
      }
      
      // If overall CAD risk is extreme (>0.8), pulse the muscle tissue slightly
      if (overallRisk > 0.8 && meshColor === muscleColor) {
        meshEmissive = '#4a0000';
        meshEmissiveIntensity = 0.2;
      }

      return (
        <HeartMesh 
          key={filename} 
          url={`${basePath}${filename}`} 
          color={meshColor} 
          opacity={meshOpacity}
          emissive={meshEmissive}
          emissiveIntensity={meshEmissiveIntensity}
        />
      );
    });
  }, [allModels, ladRisk, lcxRisk, rcaRisk, overallRisk]);

  return (
    <Canvas style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} camera={{ position: [0, 0, 200], fov: 45 }}>
      <Suspense fallback={<Loader />}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[30, 30, 30]} intensity={1.8} />
        <directionalLight position={[-30, -30, -10]} intensity={0.9} />
        <pointLight position={[0, 0, 50]} intensity={0.6} />
        
        <Stage environment="city" intensity={0.4} adjustCamera={1.2}>
          {renderMeshes}
        </Stage>
        
        {/* We use autoRotate to give it a dramatic spin on load */}
        <OrbitControls makeDefault autoRotate autoRotateSpeed={2.0} minDistance={50} maxDistance={400} />
      </Suspense>
    </Canvas>
  );
}
