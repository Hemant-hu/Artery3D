# Design

## 1. Visual Aesthetics
- **Theme:** Modern, medical-tech aesthetic with a dark mode base to make the 3D model and data visualizations pop.
- **Colors:** 
  - Background: Deep slate/navy (#0f172a).
  - Primary Accents: Cyan/Teal for standard UI elements.
  - Risk Colors: Green (Low Risk) -> Yellow/Orange (Medium Risk) -> Red (High Risk/Stenosis).
- **Typography:** Clean, sans-serif fonts (e.g., Inter or Roboto) for high legibility of clinical data.

## 2. Layout
- **Split View:**
  - **Left Pane (3D Canvas):** Takes up ~60% of the screen. Immersive 3D view with overlaid floating UI controls for camera reset and rendering options.
  - **Right Pane (Clinical Dashboard):** Takes up ~40% of the screen. Scrollable or tabbed view containing patient data inputs, prediction results, and SHAP value breakdowns.
- **Footer/Overlay:** Persistent clinical safety disclaimer.

## 3. Interactive Elements
- Smooth transitions when risk scores update.
- Tooltips when hovering over anatomical nodes in the 3D model or features in the SHAP chart.
- Responsive design adapting to different screen sizes.
