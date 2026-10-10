# Product Requirements Document (PRD)

## 1. Overview
The project is a web-based interactive 3D visualization system that predicts Coronary Artery Disease (CAD) and overall cardiac risk using patient physiological and clinical data. It maps these predictions onto an interactive 3D human anatomical model.

## 2. Objectives
- Train classification models to predict overall CAD status and specific stenosis in LAD, LCX, and RCA vessels.
- Render an interactive 3D heart/torso model in the browser.
- Build a clinical dashboard explaining the prediction using feature attributions (SHAP/LIME).

## 3. Scope & Features
### 3.1 Predictive Modeling
- Inputs: Demographics, clinical exam, ECG, lab, echocardiographic features.
- Exclusions: LAD, LCX, RCA, Cath (to prevent target leakage).
- Outputs: CAD classification, LAD/LCX/RCA stenosis probabilities.
- Metrics: Accuracy, Precision, Recall, F1, ROC-AUC.

### 3.2 3D Visual Mapping
- Interactive 3D model (rotate, zoom, select).
- Dynamic color-coding of coronary artery nodes (LAD, LCX, RCA) based on stenosis risk.

### 3.3 Clinical Dashboard
- Display predictions and probabilities.
- Interpretable AI breakdown (e.g., SHAP values).
- Display physiological measurements alongside relative contributions.
- Clear clinical safety disclaimer.

## 4. Deliverables
- Working Web Prototype
- Trained Prediction Pipeline
- Clinical Explanation Dashboard
- Project Documentation
- Demonstration Video
