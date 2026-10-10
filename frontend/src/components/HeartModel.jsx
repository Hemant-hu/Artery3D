import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';

function HeartMesh({ url, color }) {
  const obj = useLoader(OBJLoader, url);
  
  // Clone to avoid mutation issues
  const geometry = React.useMemo(() => {
    const clone = obj.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.4,
          metalness: 0.1
        });
      }
    });
    return clone;
  }, [obj, color]);

  return <primitive object={geometry} />;
}

export default function HeartModel({ prediction }) {
  const basePath = '/models/BP51782_FMA3_2_1_inference_isa_FMA67135_Postnatal_anatomical_structure 2/BP51782_FMA3_2_1_inference_isa_FMA67135_Postnatal_anatomical_structure/';
  
  // Determine colors based on risk probability
  const ladRisk = prediction?.stenosis_probabilities?.LAD || 0;
  const lcxRisk = prediction?.stenosis_probabilities?.LCX || 0;
  const rcaRisk = prediction?.stenosis_probabilities?.RCA || 0;
  
  // Bright glowing red if risk > 50%, otherwise healthy dark red
  const ladColor = ladRisk > 0.5 ? '#ff0000' : '#4a0000';
  const lcxColor = lcxRisk > 0.5 ? '#ff0000' : '#4a0000';
  const rcaColor = rcaRisk > 0.5 ? '#ff0000' : '#4a0000';
  
  // Heart muscle base color
  const muscleColor = '#a84646';

  return (
    <Canvas style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} camera={{ position: [0, 0, 150], fov: 45 }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} />
        <Stage environment="city" intensity={0.6}>
          {/* Main Ventricle Wall */}
          <HeartMesh url={`${basePath}MM614_BP51876_FMA84850_Free wall of left ventricle.obj`} color={muscleColor} />
          
          {/* LAD Branch */}
          <HeartMesh url={`${basePath}MM434_BP51970_FMA3893_Anterior septal branch of anterior interventricular artery.obj`} color={ladColor} />
          
          {/* LCX Trunk */}
          <HeartMesh url={`${basePath}MM635_BP51973_FMA74923_Trunk of circumflex branch of left coronary artery.obj`} color={lcxColor} />
          
          {/* RCA Trunk */}
          <HeartMesh url={`${basePath}MM439_BP51977_FMA3802_Trunk of right coronary artery.obj`} color={rcaColor} />
        </Stage>
        <OrbitControls makeDefault autoRotate autoRotateSpeed={2.0} />
      </Suspense>
    </Canvas>
  );
}
