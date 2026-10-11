// Classification and anatomical clinical metadata for all 119 heart meshes

export function classifyMesh(filename) {
  const low = filename.toLowerCase();
  
  // Clean human-friendly name from BodyParts3D FMA identifier
  const parts = filename.replace('.obj', '').split('_');
  const rawName = parts[parts.length - 1];

  // 1. LAD (Left Anterior Descending / Anterior Interventricular Artery)
  if (low.includes('anterior interventricular') || low.includes('septal branch of anterior')) {
    return {
      category: 'LAD',
      vesselKey: 'LAD',
      name: rawName,
      displayName: 'Left Anterior Descending Artery (LAD)',
      territory: 'Anterior left ventricular wall, anterior 2/3 of interventricular septum, cardiac apex',
      clinicalNote: 'Critical "widowmaker" vessel. Stenosis >50% indicates significant risk for extensive anterior myocardial infarction.',
      isArtery: true
    };
  }

  // 2. LCX (Left Circumflex Artery)
  if (low.includes('circumflex') || low.includes('left marginal artery')) {
    return {
      category: 'LCX',
      vesselKey: 'LCX',
      name: rawName,
      displayName: 'Left Circumflex Artery (LCX)',
      territory: 'Posterior and lateral walls of the left ventricle, left atrium',
      clinicalNote: 'Traverses the coronary sulcus, branching into obtuse marginal arteries (OM). Associated with lateral wall ischemia.',
      isArtery: true
    };
  }

  // 3. RCA (Right Coronary Artery)
  if (low.includes('right coronary') || low.includes('marginal branch of right coronary')) {
    return {
      category: 'RCA',
      vesselKey: 'RCA',
      name: rawName,
      displayName: 'Right Coronary Artery (RCA)',
      territory: 'Right atrium, right ventricle, inferior LV wall, posterior septum, SA node (60%), AV node (90%)',
      clinicalNote: 'Supplies the cardiac conduction pacemakers and right heart. Stenosis risks bradycardia, heart blocks, and inferior STEMI.',
      isArtery: true
    };
  }

  // 4. LMCA / CATH (Left Main Coronary Artery Stem & Catheterization Port)
  if (low.includes('stem of left coronary')) {
    return {
      category: 'LMCA',
      vesselKey: 'Overall_CAD',
      name: rawName,
      displayName: 'Stem of Left Coronary Artery (LMCA / Cath Entry)',
      territory: 'Origin trunk supplying both LAD and LCX (>75% of left ventricular myocardial blood supply)',
      clinicalNote: 'Primary diagnostic entry point for cardiac catheterization (Cath). Stenosis here is the highest prognostic risk in CAD.',
      isArtery: true
    };
  }

  // 5. AORTA (Ascending Aorta & Root)
  if (low.includes('ascending aorta') || low.includes('bulb of aorta')) {
    return {
      category: 'AORTA',
      name: rawName,
      displayName: 'Ascending Aorta & Aortic Root',
      territory: 'Systemic oxygenated arterial outflow from the left ventricle',
      clinicalNote: 'The coronary ostia originate here directly above the aortic valve cusps.',
      isArtery: true
    };
  }

  // 6. VEINS (Coronary Veins & Coronary Sinus)
  if (low.includes('cardiac vein') || low.includes('coronary sinus') || low.includes('marginal vein')) {
    return {
      category: 'VEIN',
      name: rawName,
      displayName: rawName.includes('Great') ? 'Great Cardiac Vein (Accompanies LAD)' : 
                   rawName.includes('Sinus') ? 'Coronary Sinus (Main Venous Trunk)' : 
                   rawName.includes('Small') ? 'Small Cardiac Vein' : 'Anterior Cardiac Vein',
      territory: 'Venous deoxygenated drainage from ventricular myocardium returning to the right atrium',
      clinicalNote: 'The Great Cardiac Vein runs in the anterior groove beside the LAD. Coronary Sinus is vital for CRT pacemaker lead placement.',
      isVein: true
    };
  }

  // 7. PULMONARY (Pulmonary Trunk & Outflow)
  if (low.includes('pulmonary trunk') || low.includes('pulmonary')) {
    return {
      category: 'PULMONARY',
      name: rawName,
      displayName: 'Pulmonary Trunk & Outflow',
      territory: 'Deoxygenated outflow from the right ventricle towards pulmonary circulation',
      clinicalNote: 'Low-pressure venous arterial conduit to the lungs.',
      isVessel: true
    };
  }

  // 8. CONDUCTION SYSTEM (Nodes & Tracts)
  if (low.includes('node') || low.includes('bundle') || low.includes('tract')) {
    return {
      category: 'CONDUCTION',
      name: rawName,
      displayName: rawName,
      territory: 'Electrical pacemaker and high-speed conduction pathways of the myocardium',
      clinicalNote: 'Generates and coordinates cardiac rhythmic electrical depolarization.',
      isConduction: true
    };
  }

  // 9. VALVES & FIBROUS SKELETON
  if (low.includes('valve') || low.includes('leaflet') || low.includes('anulus') || 
      low.includes('scallop') || low.includes('fibrous') || low.includes('trigone') || 
      low.includes('tendon')) {
    return {
      category: 'VALVE',
      name: rawName,
      displayName: rawName,
      territory: 'Fibrous cardiac framework ensuring unidirectional laminar blood flow',
      clinicalNote: 'Mitral, Aortic, Tricuspid, and Pulmonary valvular apparatus.',
      isValve: true
    };
  }

  // 10. MYOCARDIUM (Ventricular & Atrial Muscle Walls)
  return {
    category: 'MYOCARDIUM',
    name: rawName,
    displayName: rawName,
    territory: 'Contractile muscular myocardium of cardiac chambers',
    clinicalNote: 'Generates hydraulic pressure gradients for systemic and pulmonary perfusion.',
    isMuscle: true
  };
}

export const PIN_LOCATIONS = [
  {
    id: 'LAD',
    label: 'LAD',
    title: 'Left Anterior Descending Artery',
    position: [34.2, -147.6, 1226.1],
    vesselKey: 'LAD',
    cameraOffset: [20, -130, 1370],
    description: 'Anterior interventricular groove (Septal branches)'
  },
  {
    id: 'LCX',
    label: 'LCX',
    title: 'Left Circumflex Artery',
    position: [45.8, -114.9, 1216.5],
    vesselKey: 'LCX',
    cameraOffset: [-80, -110, 1140],
    description: 'Left atrioventricular sulcus & marginal branch'
  },
  {
    id: 'RCA',
    label: 'RCA',
    title: 'Right Coronary Artery',
    position: [5.3, -147.0, 1220.1],
    vesselKey: 'RCA',
    cameraOffset: [90, -140, 1180],
    description: 'Right atrioventricular sulcus & acute marginals'
  },
  {
    id: 'LMCA',
    label: 'Cath / LMCA',
    title: 'Stem of Left Coronary Artery (Cath Entry)',
    position: [33.8, -122.7, 1250.9],
    vesselKey: 'Overall_CAD',
    cameraOffset: [30, -50, 1390],
    description: 'Left main bifurcation trunk (Angiography entry)'
  },
  {
    id: 'VEIN',
    label: 'Venous System',
    title: 'Great Cardiac Vein & Coronary Sinus',
    position: [30.7, -128.4, 1214.2],
    vesselKey: null,
    cameraOffset: [-40, -60, 1120],
    description: 'Coronary venous return drainage network'
  }
];
