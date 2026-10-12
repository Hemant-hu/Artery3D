import os
import joblib
import pandas as pd
import shap
import warnings
from preprocess import engineer_features

warnings.filterwarnings("ignore", category=UserWarning)

class ClinicalPredictor:
    def __init__(self, models_dir='models'):
        self.models_dir = models_dir
        self.scaler = joblib.load(os.path.join(models_dir, 'scaler.joblib'))
        self.feature_columns = joblib.load(os.path.join(models_dir, 'feature_columns.joblib'))
        
        # Load best models
        self.models = {
            'Overall_CAD': joblib.load(os.path.join(models_dir, 'best_model_Overall_CAD.joblib')),
            'LAD': joblib.load(os.path.join(models_dir, 'best_model_LAD.joblib')),
            'LCX': joblib.load(os.path.join(models_dir, 'best_model_LCX.joblib')),
            'RCA': joblib.load(os.path.join(models_dir, 'best_model_RCA.joblib'))
        }
        
        # Initialize SHAP explainer on the Overall CAD model
        main_model = self.models['Overall_CAD']
        try:
            self.explainer = shap.TreeExplainer(main_model)
            self.explainer_type = 'tree'
        except Exception:
            # For ensembles (VotingClassifier / StackingClassifier), explain using representative tree estimator
            if hasattr(main_model, 'named_estimators_') and 'et' in main_model.named_estimators_:
                self.explainer = shap.TreeExplainer(main_model.named_estimators_['et'])
                self.explainer_type = 'tree'
            elif hasattr(main_model, 'named_estimators_') and 'cat' in main_model.named_estimators_:
                self.explainer = shap.TreeExplainer(main_model.named_estimators_['cat'])
                self.explainer_type = 'tree'
            else:
                self.explainer = shap.Explainer(main_model.predict_proba, pd.DataFrame([self.scaler.mean_], columns=self.feature_columns))
                self.explainer_type = 'other'
            
    def _prepare_inference_data(self, df):
        """Applies exact feature engineering and aligns columns."""
        df_engineered = engineer_features(df)
        
        # Ensure all columns required by the model exist (fill missing with 0)
        for col in self.feature_columns:
            if col not in df_engineered.columns:
                df_engineered[col] = 0.0
                
        # Drop unexpected columns and enforce order
        return df_engineered[self.feature_columns]
        
    def predict_patient_risk(self, patient_data_dict):
        """
        End-to-end inference for a single patient.
        Returns probability scores and local SHAP feature importances.
        """
        df = pd.DataFrame([patient_data_dict])
        
        # Engineer and align features
        df_engineered = self._prepare_inference_data(df)
        
        # Scale
        X_scaled = self.scaler.transform(df_engineered)
        X_scaled = pd.DataFrame(X_scaled, columns=self.feature_columns)
        
        # Predict probabilities
        probabilities = {}
        for target, model in self.models.items():
            if hasattr(model, 'predict_proba'):
                prob = float(model.predict_proba(X_scaled)[0, 1])
            else:
                # Fallback if model strictly outputs class
                prob = float(model.predict(X_scaled)[0])
            probabilities[target] = prob
            
        # Extract SHAP Values
        shap_values = self.explainer.shap_values(X_scaled)
        
        # Normalize SHAP output structure depending on the explainer behavior
        if self.explainer_type == 'tree':
            if isinstance(shap_values, list):
                shap_class1 = shap_values[1][0]
            elif len(shap_values.shape) == 3:
                shap_class1 = shap_values[0, :, 1]
            else:
                shap_class1 = shap_values[0]
        else:
            shap_class1 = shap_values[0]
            
        shap_dict = {feat: float(val) for feat, val in zip(self.feature_columns, shap_class1)}
        
        return {
            "probabilities": probabilities,
            "shap_values": shap_dict
        }
